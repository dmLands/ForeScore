import { useState, useCallback } from 'react';
import { usePlatform } from '@/lib/platform';
import {
  fetchProducts,
  purchaseProduct,
  restorePurchases,
  finishTransaction,
  isIAPAvailable,
  type AppleIAPProduct,
} from '@/lib/appleIap';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const PRODUCT_IDS = ['forescore_monthly', 'forescore_annual'];

export function useAppleIAP() {
  const { isIOS, isNative } = usePlatform();
  const { toast } = useToast();
  const [products, setProducts] = useState<AppleIAPProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = isIOS && isNative;

  const loadProducts = useCallback(async () => {
    if (!available) {
      console.log('[useAppleIAP] loadProducts skipped: available=false, isIOS=', isIOS, 'isNative=', isNative);
      return;
    }

    console.log('[useAppleIAP] Loading products for IDs:', PRODUCT_IDS);
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProducts = await fetchProducts(PRODUCT_IDS);
      console.log('[useAppleIAP] Products loaded:', fetchedProducts.length, fetchedProducts.map(p => p.productId));
      setProducts(fetchedProducts);
      if (fetchedProducts.length === 0) {
        console.warn('[useAppleIAP] WARNING: No products returned from StoreKit');
      }
    } catch (err: any) {
      console.error('[useAppleIAP] Failed to load products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [available, isIOS, isNative]);

  const purchase = useCallback(async (productId: string): Promise<boolean> => {
    if (!available) {
      console.error('[useAppleIAP] Purchase blocked: IAP not available. isIOS=', isIOS, 'isNative=', isNative);
      setError('In-app purchases are not available on this device.');
      return false;
    }

    console.log('[useAppleIAP] Starting purchase for:', productId);
    setIsPurchasing(true);
    setError(null);
    try {
      console.log('[useAppleIAP] Calling native purchaseProduct...');
      const transaction = await purchaseProduct(productId);
      if (!transaction) {
        console.warn('[useAppleIAP] purchaseProduct returned null (cancelled or failed)');
        throw new Error('Purchase cancelled or failed');
      }

      console.log('[useAppleIAP] Native purchase succeeded, transactionId:', transaction.transactionId, 'productId:', transaction.productId);
      console.log('[useAppleIAP] Validating transaction with server...');

      const response = await apiRequest('POST', '/api/apple/validate-transaction', {
        transactionId: transaction.transactionId,
        jws: transaction.jwsRepresentation,
      });

      const result = await response.json();
      console.log('[useAppleIAP] Server validation result:', result);

      if (result.success) {
        console.log('[useAppleIAP] Server validation succeeded, finishing transaction...');
        await finishTransaction(transaction.transactionId);

        await queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/apple/subscription-status'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

        toast({
          title: 'Subscription Active',
          description: 'Your ForeScore subscription is now active!',
        });
        console.log('[useAppleIAP] Purchase flow complete - SUCCESS');
        return true;
      } else {
        console.error('[useAppleIAP] Server validation failed:', result.message);
        throw new Error(result.message || 'Failed to validate purchase with server');
      }
    } catch (err: any) {
      const message = err.message || 'Purchase failed';
      console.error('[useAppleIAP] Purchase error:', message, err);
      if (message.includes('cancelled') || message.includes('canceled')) {
        console.log('[useAppleIAP] Purchase was cancelled by user');
      } else {
        setError(message);
        toast({
          title: 'Purchase Failed',
          description: message,
          variant: 'destructive',
        });
      }
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [available, isIOS, isNative, toast]);

  const restore = useCallback(async () => {
    if (!available) return;

    console.log('[useAppleIAP] Restoring purchases...');
    setIsRestoring(true);
    setError(null);
    try {
      const transactions = await restorePurchases();
      console.log('[useAppleIAP] Restore found', transactions.length, 'transactions');

      if (transactions.length === 0) {
        toast({
          title: 'No Purchases Found',
          description: 'No previous subscriptions were found to restore.',
        });
        return;
      }

      let restored = false;
      for (const transaction of transactions) {
        try {
          console.log('[useAppleIAP] Validating restored transaction:', transaction.transactionId);
          const response = await apiRequest('POST', '/api/apple/validate-transaction', {
            transactionId: transaction.transactionId,
            jws: transaction.jwsRepresentation,
          });
          const result = await response.json();
          if (result.success) {
            await finishTransaction(transaction.transactionId);
            restored = true;
            console.log('[useAppleIAP] Restored transaction validated:', transaction.transactionId);
          }
        } catch (restoreErr) {
          console.error('[useAppleIAP] Failed to validate restored transaction:', transaction.transactionId, restoreErr);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/apple/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      if (restored) {
        toast({
          title: 'Purchases Restored',
          description: 'Your subscription has been restored successfully!',
        });
      } else {
        toast({
          title: 'No Active Subscription',
          description: 'No active subscription was found to restore.',
        });
      }
    } catch (err: any) {
      console.error('[useAppleIAP] Restore failed:', err);
      setError(err.message || 'Restore failed');
      toast({
        title: 'Restore Failed',
        description: err.message || 'Failed to restore purchases',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  }, [available, toast]);

  return {
    available,
    products,
    isLoading,
    isPurchasing,
    isRestoring,
    error,
    setError,
    loadProducts,
    purchase,
    restore,
  };
}
