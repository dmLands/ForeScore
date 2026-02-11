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
}

function getPlugin(): ForeScoreIAPPlugin | null {
  if (!isNativeIOS()) return null;

  try {
    const w = window as any;
    if (w.Capacitor?.Plugins?.ForeScoreIAP) {
      return w.Capacitor.Plugins.ForeScoreIAP as ForeScoreIAPPlugin;
    }
  } catch {}

  return null;
}

export function isIAPAvailable(): boolean {
  return getPlugin() !== null;
}

export async function fetchProducts(productIds: string[]): Promise<AppleIAPProduct[]> {
  const plugin = getPlugin();
  if (!plugin) return [];

  try {
    const result = await plugin.getProducts({ productIds });
    return result.products || [];
  } catch (error) {
    console.error('Apple IAP: Failed to fetch products:', error);
    return [];
  }
}

export async function purchaseProduct(productId: string): Promise<AppleIAPTransaction | null> {
  const plugin = getPlugin();
  if (!plugin) throw new Error('Apple IAP not available');

  const result = await plugin.purchaseProduct({ productId });
  return result.transaction || null;
}

export async function restorePurchases(): Promise<AppleIAPTransaction[]> {
  const plugin = getPlugin();
  if (!plugin) return [];

  const result = await plugin.restorePurchases();
  return result.transactions || [];
}

export async function getActiveSubscriptions(): Promise<AppleIAPTransaction[]> {
  const plugin = getPlugin();
  if (!plugin) return [];

  const result = await plugin.getActiveSubscriptions();
  return result.transactions || [];
}

export async function finishTransaction(transactionId: string): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;

  await plugin.finishTransaction({ transactionId });
}
