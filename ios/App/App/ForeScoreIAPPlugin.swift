import Foundation
import Capacitor
import StoreKit

@objc(ForeScoreIAPPlugin)
public class ForeScoreIAPPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ForeScoreIAPPlugin"
    public let jsName = "ForeScoreIAP"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getActiveSubscriptions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishTransaction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "diagnose", returnType: CAPPluginReturnPromise),
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            call.resolve(["available": true])
        } else {
            call.resolve(["available": false])
        }
    }

    @objc func diagnose(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(["error": "iOS 15+ required"])
            return
        }

        let productIds = ["forescore_monthly", "forescore_annual"]

        Task {
            var info: [String: Any] = [
                "requestedIds": productIds,
                "iosVersion": UIDevice.current.systemVersion,
                "bundleId": Bundle.main.bundleIdentifier ?? "unknown",
            ]

            do {
                let products = try await Product.products(for: Set(productIds))
                info["foundCount"] = products.count
                info["foundProducts"] = products.map { p -> [String: Any] in
                    return [
                        "id": p.id,
                        "displayName": p.displayName,
                        "type": String(describing: p.type),
                        "price": p.displayPrice,
                    ]
                }

                if products.isEmpty {
                    info["diagnosis"] = "StoreKit returned 0 products. Check: 1) Products exist in App Store Connect with status Ready to Submit, 2) Paid Apps agreement is active, 3) Bundle ID matches, 4) Products may need up to 24h to propagate after creation/changes, 5) Device is signed into sandbox account"
                }
            } catch {
                info["error"] = error.localizedDescription
                info["errorType"] = String(describing: type(of: error))
                info["diagnosis"] = "StoreKit threw an error fetching products. This usually means a network issue or App Store Connect configuration problem."
            }

            NSLog("[ForeScoreIAP] Diagnose result: %@", "\(info)")
            call.resolve(info)
        }
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("StoreKit 2 requires iOS 15.0 or later")
            return
        }

        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Missing productIds parameter")
            return
        }

        NSLog("[ForeScoreIAP] Fetching products for IDs: %@", productIds.joined(separator: ", "))

        Task {
            do {
                let products = try await Product.products(for: Set(productIds))
                NSLog("[ForeScoreIAP] Found %d products out of %d requested", products.count, productIds.count)

                let result = products.map { product -> [String: Any] in
                    NSLog("[ForeScoreIAP] Product: %@ (%@) - %@", product.id, product.displayName, product.displayPrice)
                    var dict: [String: Any] = [
                        "productId": product.id,
                        "localizedTitle": product.displayName,
                        "localizedDescription": product.description,
                        "price": product.displayPrice,
                        "priceLocale": product.priceFormatStyle.locale.identifier,
                    ]

                    if let subscription = product.subscription {
                        let period = subscription.subscriptionPeriod
                        dict["subscriptionPeriod"] = "\(period.value) \(period.unit)"

                        if let introOffer = subscription.introductoryOffer {
                            if introOffer.paymentMode == .freeTrial {
                                let trialPeriod = introOffer.period
                                dict["introductoryPrice"] = "Free"
                                dict["introductoryPricePeriod"] = "\(trialPeriod.value)-\(trialPeriod.unit) free trial"
                            }
                        }
                    }

                    return dict
                }

                if products.isEmpty {
                    NSLog("[ForeScoreIAP] WARNING: No products found. Bundle ID: %@", Bundle.main.bundleIdentifier ?? "unknown")
                }

                call.resolve(["products": result])
            } catch {
                NSLog("[ForeScoreIAP] ERROR fetching products: %@", error.localizedDescription)
                call.reject("Failed to fetch products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("StoreKit 2 requires iOS 15.0 or later")
            return
        }

        guard let productId = call.getString("productId") else {
            call.reject("Missing productId parameter")
            return
        }

        NSLog("[ForeScoreIAP] Attempting purchase for: %@", productId)

        Task { @MainActor in
            do {
                let products = try await Product.products(for: [productId])
                NSLog("[ForeScoreIAP] Purchase lookup found %d products for %@", products.count, productId)

                guard let product = products.first else {
                    NSLog("[ForeScoreIAP] Product not found: %@. Bundle: %@", productId, Bundle.main.bundleIdentifier ?? "unknown")
                    call.reject("Product not found: \(productId). Ensure the product ID matches App Store Connect and the Paid Apps agreement is active.")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    let transaction = try self.checkVerified(verification)
                    NSLog("[ForeScoreIAP] Purchase successful: %@ (txn: %llu)", productId, transaction.id)

                    let transactionDict: [String: Any] = [
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "productId": transaction.productID,
                        "jwsRepresentation": verification.jwsRepresentation,
                    ]

                    call.resolve(["transaction": transactionDict])

                case .userCancelled:
                    NSLog("[ForeScoreIAP] Purchase cancelled by user")
                    call.reject("Purchase cancelled by user")

                case .pending:
                    NSLog("[ForeScoreIAP] Purchase pending approval")
                    call.reject("Purchase is pending approval")

                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                NSLog("[ForeScoreIAP] Purchase error: %@", error.localizedDescription)
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("StoreKit 2 requires iOS 15.0 or later")
            return
        }

        Task {
            do {
                try await AppStore.sync()

                var transactions: [[String: Any]] = []

                for await result in Transaction.currentEntitlements {
                    if let transaction = try? self.checkVerified(result) {
                        if transaction.productType == .autoRenewable {
                            transactions.append([
                                "transactionId": String(transaction.id),
                                "originalTransactionId": String(transaction.originalID),
                                "productId": transaction.productID,
                                "jwsRepresentation": result.jwsRepresentation,
                            ])
                        }
                    }
                }

                call.resolve(["transactions": transactions])
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func getActiveSubscriptions(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("StoreKit 2 requires iOS 15.0 or later")
            return
        }

        Task {
            var transactions: [[String: Any]] = []

            for await result in Transaction.currentEntitlements {
                if let transaction = try? self.checkVerified(result) {
                    if transaction.productType == .autoRenewable {
                        transactions.append([
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "productId": transaction.productID,
                            "jwsRepresentation": result.jwsRepresentation,
                        ])
                    }
                }
            }

            call.resolve(["transactions": transactions])
        }
    }

    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("StoreKit 2 requires iOS 15.0 or later")
            return
        }

        guard let transactionIdStr = call.getString("transactionId"),
              let transactionId = UInt64(transactionIdStr) else {
            call.reject("Missing or invalid transactionId parameter")
            return
        }

        Task {
            for await result in Transaction.unfinished {
                if let transaction = try? self.checkVerified(result) {
                    if transaction.id == transactionId {
                        await transaction.finish()
                        call.resolve()
                        return
                    }
                }
            }

            call.resolve()
        }
    }

    @available(iOS 15.0, *)
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let value):
            return value
        }
    }
}
