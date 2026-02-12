import { AppStoreServerAPIClient, Environment, SignedDataVerifier } from "@apple/app-store-server-library";
import { storage } from "./storage";
import type { InsertAppleSubscription } from "@shared/schema";

const APPLE_BUNDLE_ID = "xyz.forescore.app";
const APPLE_APP_ID = process.env.APPLE_IAP_APP_ID ? parseInt(process.env.APPLE_IAP_APP_ID, 10) : undefined;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

export const APPLE_IAP_PRODUCTS: Record<string, { productId: string; name: string; interval: 'month' | 'year'; amount: number; trialDays: number }> = {
  monthly: {
    productId: "forescore_monthly",
    name: "ForeScore Monthly",
    interval: "month",
    amount: 199,
    trialDays: 7,
  },
  annual: {
    productId: "forescore_annual",
    name: "ForeScore Annual",
    interval: "year",
    amount: 1799,
    trialDays: 7,
  },
};

function getAppleCredentials() {
  const keyId = process.env.APPLE_IAP_KEY_ID;
  const issuerId = process.env.APPLE_IAP_ISSUER_ID;
  const privateKey = process.env.APPLE_IAP_PRIVATE_KEY;

  if (!keyId || !issuerId || !privateKey) {
    throw new Error("Missing Apple IAP credentials (APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PRIVATE_KEY)");
  }

  return { keyId, issuerId, privateKey };
}

function getApiClient(environment: Environment = Environment.PRODUCTION): AppStoreServerAPIClient {
  const { keyId, issuerId, privateKey } = getAppleCredentials();
  return new AppStoreServerAPIClient(
    privateKey,
    keyId,
    issuerId,
    APPLE_BUNDLE_ID,
    environment
  );
}

const APPLE_ROOT_CA_URLS = [
  "https://www.apple.com/appleca/AppleIncRootCertificate.cer",
  "https://www.apple.com/certificateauthority/AppleComputerRootCertificate.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
];

let cachedRootCAs: Buffer[] | null = null;

async function getAppleRootCAs(): Promise<Buffer[]> {
  if (cachedRootCAs) return cachedRootCAs;

  const certs: Buffer[] = [];
  for (const url of APPLE_ROOT_CA_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        certs.push(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.warn(`⚠️ Failed to fetch Apple root CA from ${url}:`, err);
    }
  }

  if (certs.length === 0) {
    if (!IS_DEVELOPMENT) {
      throw new Error("Failed to fetch any Apple root CA certificates - cannot verify JWS signatures");
    }
    console.warn("⚠️ [DEV ONLY] No Apple root CAs loaded; JWS verification will use decode-only fallback");
    return [];
  }

  cachedRootCAs = certs;
  console.log(`✅ Loaded ${certs.length} Apple root CA certificates for JWS verification`);
  return certs;
}

async function getSignedDataVerifier(environment: Environment = Environment.PRODUCTION): Promise<SignedDataVerifier> {
  const rootCAs = await getAppleRootCAs();
  return new SignedDataVerifier(
    rootCAs,
    true,
    environment,
    APPLE_BUNDLE_ID,
    APPLE_APP_ID
  );
}

function mapProductIdToPlanKey(productId: string): string | undefined {
  for (const [key, plan] of Object.entries(APPLE_IAP_PRODUCTS)) {
    if (plan.productId === productId) return key;
  }
  return undefined;
}

export class AppleIapService {

  private async verifyTransactionJWS(jws: string): Promise<{ decoded: any; verified: boolean; environment: string }> {
    const errors: string[] = [];
    for (const env of [Environment.PRODUCTION, Environment.SANDBOX]) {
      try {
        const verifier = await getSignedDataVerifier(env);
        const decoded = await verifier.verifyAndDecodeTransaction(jws);
        return {
          decoded,
          verified: true,
          environment: env === Environment.SANDBOX ? "Sandbox" : "Production",
        };
      } catch (err: any) {
        errors.push(`${env}: ${err.message || err}`);
        continue;
      }
    }

    if (IS_DEVELOPMENT) {
      console.warn("⚠️ [DEV ONLY] JWS signature verification failed, using decode-only fallback");
      const decoded = this.decodeJWSPayload(jws);
      if (!decoded) throw new Error("Failed to decode transaction JWS");
      return {
        decoded,
        verified: false,
        environment: decoded.environment || "Sandbox",
      };
    }

    throw new Error(`JWS signature verification failed: ${errors.join("; ")}`);
  }

  private async verifyNotificationJWS(jws: string): Promise<{ decoded: any; verified: boolean }> {
    const errors: string[] = [];
    for (const env of [Environment.PRODUCTION, Environment.SANDBOX]) {
      try {
        const verifier = await getSignedDataVerifier(env);
        const decoded = await verifier.verifyAndDecodeNotification(jws);
        return { decoded, verified: true };
      } catch (err: any) {
        errors.push(`${env}: ${err.message || err}`);
        continue;
      }
    }

    if (IS_DEVELOPMENT) {
      console.warn("⚠️ [DEV ONLY] Notification JWS verification failed, using decode-only fallback");
      const decoded = this.decodeJWSPayload(jws);
      if (!decoded) throw new Error("Failed to decode notification JWS");
      return { decoded, verified: false };
    }

    throw new Error(`Notification JWS signature verification failed: ${errors.join("; ")}`);
  }

  async validateAndSaveTransaction(userId: string, transactionId: string, jws: string): Promise<{
    success: boolean;
    subscription?: any;
    error?: string;
  }> {
    try {
      const { decoded, verified, environment: envString } = await this.verifyTransactionJWS(jws);

      if (!decoded) {
        return { success: false, error: "Failed to verify transaction JWS" };
      }

      if (!verified) {
        console.warn(`⚠️ Apple IAP: Transaction ${transactionId} was decoded but NOT cryptographically verified`);
      }

      if (decoded.bundleId && decoded.bundleId !== APPLE_BUNDLE_ID) {
        return { success: false, error: `Bundle ID mismatch: expected ${APPLE_BUNDLE_ID}, got ${decoded.bundleId}` };
      }

      const productId = decoded.productId;
      const originalTransactionId = decoded.originalTransactionId || transactionId;
      const expiresDateMs = decoded.expiresDate;
      const purchaseDateMs = decoded.purchaseDate;

      const subscriptionData: InsertAppleSubscription = {
        userId,
        productId,
        originalTransactionId,
        latestTransactionId: transactionId,
        status: "active",
        environment: envString === "Sandbox" ? "Sandbox" : "Production",
        purchaseDate: purchaseDateMs ? new Date(purchaseDateMs) : null,
        expiresDate: expiresDateMs ? new Date(expiresDateMs) : null,
        renewalDate: expiresDateMs ? new Date(expiresDateMs) : null,
        isInBillingRetry: 0,
        autoRenewEnabled: 1,
        revocationDate: null,
        lastVerifiedAt: new Date(),
        rawJws: jws,
      };

      const subscription = await storage.upsertAppleSubscription(subscriptionData);

      console.log(`✅ Apple IAP: Validated and saved subscription for user ${userId}, product ${productId}, txn ${originalTransactionId}`);

      return { success: true, subscription };
    } catch (error: any) {
      console.error("❌ Apple IAP validation error:", error);
      return { success: false, error: error.message || "Validation failed" };
    }
  }

  async getSubscriptionStatus(transactionId: string): Promise<any> {
    try {
      const client = getApiClient();
      const response = await client.getAllSubscriptionStatuses(transactionId);
      return response;
    } catch (error: any) {
      console.error("❌ Apple IAP: Failed to get subscription status:", error);

      try {
        const sandboxClient = getApiClient(Environment.SANDBOX);
        const response = await sandboxClient.getAllSubscriptionStatuses(transactionId);
        return response;
      } catch (sandboxError: any) {
        console.error("❌ Apple IAP: Sandbox fallback also failed:", sandboxError);
        throw error;
      }
    }
  }

  async handleNotification(signedPayload: string): Promise<{
    success: boolean;
    notificationType?: string;
    error?: string;
  }> {
    try {
      const { decoded, verified } = await this.verifyNotificationJWS(signedPayload);

      if (!decoded) {
        return { success: false, error: "Failed to verify notification payload" };
      }

      if (!verified) {
        console.warn("⚠️ Apple S2S: Notification was decoded but NOT cryptographically verified");
      }

      const notificationType = decoded.notificationType;
      const subtype = decoded.subtype;
      const data = decoded.data;

      console.log(`📱 Apple S2S Notification: ${notificationType} (subtype: ${subtype || "none"}) [verified: ${verified}]`);

      let transactionInfo: any = null;
      if (data?.signedTransactionInfo) {
        try {
          const txResult = await this.verifyTransactionJWS(data.signedTransactionInfo);
          transactionInfo = txResult.decoded;
        } catch (_) {
          transactionInfo = this.decodeJWSPayload(data.signedTransactionInfo);
        }
      }

      let renewalInfo: any = null;
      if (data?.signedRenewalInfo) {
        renewalInfo = this.decodeJWSPayload(data.signedRenewalInfo);
      }

      if (transactionInfo) {
        await this.processNotification(notificationType, subtype, transactionInfo, renewalInfo);
      }

      return { success: true, notificationType };
    } catch (error: any) {
      console.error("❌ Apple S2S notification error:", error);
      return { success: false, error: error.message || "Notification processing failed" };
    }
  }

  private async processNotification(
    notificationType: string,
    subtype: string | undefined,
    transactionInfo: any,
    renewalInfo: any
  ): Promise<void> {
    const originalTransactionId = transactionInfo.originalTransactionId;
    if (!originalTransactionId) {
      console.warn("⚠️ Apple S2S: No originalTransactionId in notification");
      return;
    }

    const existing = await storage.getAppleSubscriptionByTransactionId(originalTransactionId);
    if (!existing) {
      console.warn(`⚠️ Apple S2S: No subscription found for txn ${originalTransactionId}`);
      return;
    }

    const expiresDate = transactionInfo.expiresDate ? new Date(transactionInfo.expiresDate) : null;
    const autoRenewEnabled = renewalInfo?.autoRenewStatus === 1 ? 1 : 0;

    switch (notificationType) {
      case "SUBSCRIBED":
      case "DID_RENEW":
        await storage.updateAppleSubscription(originalTransactionId, {
          status: "active",
          expiresDate,
          renewalDate: expiresDate,
          autoRenewEnabled,
          isInBillingRetry: 0,
          lastVerifiedAt: new Date(),
        });
        console.log(`✅ Apple S2S: Subscription renewed/subscribed for txn ${originalTransactionId}`);
        break;

      case "EXPIRED":
        await storage.updateAppleSubscription(originalTransactionId, {
          status: "expired",
          expiresDate,
          autoRenewEnabled: 0,
          lastVerifiedAt: new Date(),
        });
        console.log(`❌ Apple S2S: Subscription expired for txn ${originalTransactionId}`);
        break;

      case "DID_FAIL_TO_RENEW":
        if (subtype === "GRACE_PERIOD") {
          await storage.updateAppleSubscription(originalTransactionId, {
            status: "grace_period",
            isInBillingRetry: 1,
            autoRenewEnabled,
            lastVerifiedAt: new Date(),
          });
        } else {
          await storage.updateAppleSubscription(originalTransactionId, {
            status: "billing_retry",
            isInBillingRetry: 1,
            autoRenewEnabled,
            lastVerifiedAt: new Date(),
          });
        }
        console.log(`⚠️ Apple S2S: Billing retry for txn ${originalTransactionId} (subtype: ${subtype})`);
        break;

      case "DID_CHANGE_RENEWAL_STATUS":
        await storage.updateAppleSubscription(originalTransactionId, {
          autoRenewEnabled,
          lastVerifiedAt: new Date(),
        });
        console.log(`ℹ️ Apple S2S: Renewal status changed for txn ${originalTransactionId}, autoRenew: ${autoRenewEnabled}`);
        break;

      case "DID_CHANGE_RENEWAL_INFO":
        await storage.updateAppleSubscription(originalTransactionId, {
          productId: renewalInfo?.autoRenewProductId || existing.productId,
          autoRenewEnabled,
          lastVerifiedAt: new Date(),
        });
        console.log(`ℹ️ Apple S2S: Renewal info changed for txn ${originalTransactionId}`);
        break;

      case "REVOKE":
        await storage.updateAppleSubscription(originalTransactionId, {
          status: "revoked",
          revocationDate: transactionInfo.revocationDate ? new Date(transactionInfo.revocationDate) : new Date(),
          lastVerifiedAt: new Date(),
        });
        console.log(`🚫 Apple S2S: Subscription revoked for txn ${originalTransactionId}`);
        break;

      case "GRACE_PERIOD_EXPIRED":
        await storage.updateAppleSubscription(originalTransactionId, {
          status: "expired",
          isInBillingRetry: 0,
          lastVerifiedAt: new Date(),
        });
        console.log(`❌ Apple S2S: Grace period expired for txn ${originalTransactionId}`);
        break;

      case "REFUND":
        await storage.updateAppleSubscription(originalTransactionId, {
          status: "revoked",
          revocationDate: new Date(),
          lastVerifiedAt: new Date(),
        });
        console.log(`💸 Apple S2S: Refund processed for txn ${originalTransactionId}`);
        break;

      default:
        console.log(`📱 Apple S2S: Unhandled notification type: ${notificationType}`);
    }
  }

  async hasAccess(userId: string): Promise<{
    hasAccess: boolean;
    reason?: string;
    expiresDate?: Date;
    productId?: string;
    planKey?: string;
    subscriptionStatus?: string;
    autoRenewEnabled?: boolean;
  }> {
    const subscription = await storage.getAppleSubscription(userId);

    if (!subscription) {
      return { hasAccess: false, reason: "No Apple subscription" };
    }

    const now = new Date();

    if (subscription.status === "active" || subscription.status === "grace_period") {
      if (subscription.expiresDate && new Date(subscription.expiresDate) > now) {
        const planKey = mapProductIdToPlanKey(subscription.productId);
        return {
          hasAccess: true,
          expiresDate: subscription.expiresDate,
          productId: subscription.productId,
          planKey: planKey || undefined,
          subscriptionStatus: subscription.status === "grace_period" ? "grace_period" : "active",
          autoRenewEnabled: subscription.autoRenewEnabled === 1,
        };
      }

      if (subscription.expiresDate && new Date(subscription.expiresDate) <= now) {
        const gracePeriodMs = 24 * 60 * 60 * 1000;
        const gracePeriodEnd = new Date(new Date(subscription.expiresDate).getTime() + gracePeriodMs);
        if (now < gracePeriodEnd) {
          return {
            hasAccess: true,
            expiresDate: subscription.expiresDate,
            productId: subscription.productId,
            planKey: mapProductIdToPlanKey(subscription.productId) || undefined,
            subscriptionStatus: "grace_period",
            autoRenewEnabled: subscription.autoRenewEnabled === 1,
          };
        }
      }
    }

    if (subscription.status === "billing_retry") {
      if (subscription.expiresDate && new Date(subscription.expiresDate) > now) {
        return {
          hasAccess: true,
          expiresDate: subscription.expiresDate,
          productId: subscription.productId,
          planKey: mapProductIdToPlanKey(subscription.productId) || undefined,
          subscriptionStatus: "billing_retry",
          autoRenewEnabled: subscription.autoRenewEnabled === 1,
        };
      }
    }

    return {
      hasAccess: false,
      reason: `Apple subscription ${subscription.status}`,
      productId: subscription.productId,
      subscriptionStatus: subscription.status,
    };
  }

  private decodeJWSPayload(jws: string): any {
    try {
      const parts = jws.split(".");
      if (parts.length !== 3) {
        console.error("Invalid JWS format: expected 3 parts");
        return null;
      }

      const payloadBase64 = parts[1];
      const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
      return JSON.parse(payloadJson);
    } catch (error) {
      console.error("Failed to decode JWS payload:", error);
      return null;
    }
  }
}

export const appleIapService = new AppleIapService();
