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
}

function getPlugin(): ForeScoreIAPPlugin | null {
  if (!isNativeIOS()) {
    console.log('Apple IAP: Not native iOS, plugin unavailable');
    return null;
  }

  try {
    const w = window as any;
    if (w.Capacitor?.Plugins?.ForeScoreIAP) {
      return w.Capacitor.Plugins.ForeScoreIAP as ForeScoreIAPPlugin;
    }
    console.warn('Apple IAP: Native iOS detected but ForeScoreIAP plugin not found in Capacitor.Plugins');
    console.log('Apple IAP: Available plugins:', Object.keys(w.Capacitor?.Plugins || {}));
  } catch (err) {
    console.error('Apple IAP: Error accessing plugin:', err);
  }

  return null;
}

export function isIAPAvailable(): boolean {
  return getPlugin() !== null;
}

export async function checkStoreKitAvailable(): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;

  try {
    const result = await plugin.isAvailable();
    return result.available;
  } catch {
    return false;
  }
}

export async function fetchProducts(productIds: string[]): Promise<AppleIAPProduct[]> {
  const plugin = getPlugin();
  if (!plugin) {
    console.warn('Apple IAP: Cannot fetch products - plugin not available');
    return [];
  }

  try {
    console.log('Apple IAP: Fetching products:', productIds);
    const result = await plugin.getProducts({ productIds });
    console.log('Apple IAP: Fetched products:', JSON.stringify(result.products?.map(p => p.productId)));
    return result.products || [];
  } catch (error) {
    console.error('Apple IAP: Failed to fetch products:', error);
    return [];
  }
}

export async function purchaseProduct(productId: string): Promise<AppleIAPTransaction | null> {
  const plugin = getPlugin();
  if (!plugin) throw new Error('Apple IAP not available');

  console.log('Apple IAP: Initiating purchase for product:', productId);
  const result = await plugin.purchaseProduct({ productId });
  console.log('Apple IAP: Purchase result received, transactionId:', result.transaction?.transactionId);
  return result.transaction || null;
}

export async function restorePurchases(): Promise<AppleIAPTransaction[]> {
  const plugin = getPlugin();
  if (!plugin) return [];

  console.log('Apple IAP: Restoring purchases...');
  const result = await plugin.restorePurchases();
  console.log('Apple IAP: Restored', result.transactions?.length || 0, 'transactions');
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

  console.log('Apple IAP: Finishing transaction:', transactionId);
  await plugin.finishTransaction({ transactionId });
}
