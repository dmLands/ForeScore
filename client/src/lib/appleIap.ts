import { registerPlugin } from '@capacitor/core';
import { isNativeIOS } from './platform';

export interface AppleIAPProduct {
  productId: string;
  localizedTitle: string;
  localizedDescription: string;
  price: string;
  priceLocale: string;
  subscriptionPeriod?: string;
  introductoryPrice?: string;
  introductoryPricePeriod?: string;
}

export interface AppleIAPTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  jwsRepresentation: string;
}

interface ForeScoreIAPPlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: AppleIAPProduct[] }>;
  purchaseProduct(options: { productId: string }): Promise<{ transaction: AppleIAPTransaction }>;
  restorePurchases(): Promise<{ transactions: AppleIAPTransaction[] }>;
  getActiveSubscriptions(): Promise<{ transactions: AppleIAPTransaction[] }>;
  finishTransaction(options: { transactionId: string }): Promise<void>;
  isAvailable(): Promise<{ available: boolean }>;
  diagnose(): Promise<Record<string, any>>;
}

const ForeScoreIAP = registerPlugin<ForeScoreIAPPlugin>('ForeScoreIAP');

export function isIAPAvailable(): boolean {
  return isNativeIOS();
}

export async function checkStoreKitAvailable(): Promise<boolean> {
  if (!isNativeIOS()) return false;

  try {
    const result = await ForeScoreIAP.isAvailable();
    return result.available;
  } catch {
    return false;
  }
}

export async function fetchProducts(productIds: string[]): Promise<AppleIAPProduct[]> {
  if (!isNativeIOS()) return [];

  try {
    const result = await ForeScoreIAP.getProducts({ productIds });
    return result.products || [];
  } catch (error) {
    console.error('Apple IAP: Failed to fetch products:', error);
    return [];
  }
}

export async function purchaseProduct(productId: string): Promise<AppleIAPTransaction | null> {
  if (!isNativeIOS()) throw new Error('Apple IAP not available');

  const result = await ForeScoreIAP.purchaseProduct({ productId });
  return result.transaction || null;
}

export async function restorePurchases(): Promise<AppleIAPTransaction[]> {
  if (!isNativeIOS()) return [];

  const result = await ForeScoreIAP.restorePurchases();
  return result.transactions || [];
}

export async function getActiveSubscriptions(): Promise<AppleIAPTransaction[]> {
  if (!isNativeIOS()) return [];

  const result = await ForeScoreIAP.getActiveSubscriptions();
  return result.transactions || [];
}

export async function finishTransaction(transactionId: string): Promise<void> {
  if (!isNativeIOS()) return;

  await ForeScoreIAP.finishTransaction({ transactionId });
}

export async function diagnoseIAP(): Promise<Record<string, any>> {
  if (!isNativeIOS()) return { error: 'Not running on native iOS' };

  try {
    const result = await ForeScoreIAP.diagnose();
    console.log('[ForeScoreIAP] Diagnose result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('[ForeScoreIAP] Diagnose error:', error);
    return { error: error.message || 'Diagnose failed' };
  }
}
