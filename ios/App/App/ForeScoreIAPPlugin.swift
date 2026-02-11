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
    ]

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Missing productIds parameter")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: Set(productIds))
                let result = products.map { product -> [String: Any] in
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

                call.resolve(["products": result])
            } catch {
                call.reject("Failed to fetch products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId parameter")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)

                    let transactionDict: [String: Any] = [
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "productId": transaction.productID,
                        "jwsRepresentation": verification.jwsRepresentation,
                    ]

                    call.resolve(["transaction": transactionDict])

                case .userCancelled:
                    call.reject("Purchase cancelled by user")

                case .pending:
                    call.reject("Purchase is pending approval")

                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()

                var transactions: [[String: Any]] = []

                for await result in Transaction.currentEntitlements {
                    if let transaction = try? checkVerified(result) {
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
        Task {
            var transactions: [[String: Any]] = []

            for await result in Transaction.currentEntitlements {
                if let transaction = try? checkVerified(result) {
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
        guard let transactionIdStr = call.getString("transactionId"),
              let transactionId = UInt64(transactionIdStr) else {
            call.reject("Missing or invalid transactionId parameter")
            return
        }

        Task {
            for await result in Transaction.unfinished {
                if let transaction = try? checkVerified(result) {
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

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let value):
            return value
        }
    }
}
