import { useState, useCallback } from 'react';
import { usePlatform } from '@/lib/platform';
import {
  fetchProducts,
  purchaseProduct,
  restorePurchases,
  finishTransaction,
  isIAPAvailable,
  type AppleIAPProduct,
  type AppleIAPTransaction,
} from '@/lib/appleIap';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const PRODUCT_IDS = ['forescore.monthly', 'forescore.annual'];

export function useAppleIAP() {
  const { isIOS, isNative } = usePlatform();
  const { toast } = useToast();
  const [products, setProducts] = useState<AppleIAPProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = isIOS && isNative && isIAPAvailable();

  const loadProducts = useCallback(async () => {
    if (!available) return;

    setIsLoading(true);
    setError(null);
    try {
      const fetchedProducts = await fetchProducts(PRODUCT_IDS);
      setProducts(fetchedProducts);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [available]);

  const purchase = useCallback(async (productId: string) => {
    if (!available) return;

    setIsPurchasing(true);
    setError(null);
    try {
      const transaction = await purchaseProduct(productId);
      if (!transaction) {
        throw new Error('Purchase cancelled or failed');
      }

      const response = await apiRequest('POST', '/api/apple/validate-transaction', {
        transactionId: transaction.transactionId,
        jws: transaction.jwsRepresentation,
      });

      const result = await response.json();

      if (result.success) {
        await finishTransaction(transaction.transactionId);

        queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/apple/subscription-status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

        toast({
          title: 'Subscription Active',
          description: 'Your ForeScore subscription is now active!',
        });
      } else {
        throw new Error(result.message || 'Failed to validate purchase');
      }
    } catch (err: any) {
      const message = err.message || 'Purchase failed';
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        setError(message);
        toast({
          title: 'Purchase Failed',
          description: message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [available, toast]);

  const restore = useCallback(async () => {
    if (!available) return;

    setIsRestoring(true);
    setError(null);
    try {
      const transactions = await restorePurchases();

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
          const response = await apiRequest('POST', '/api/apple/validate-transaction', {
            transactionId: transaction.transactionId,
            jws: transaction.jwsRepresentation,
          });
          const result = await response.json();
          if (result.success) {
            await finishTransaction(transaction.transactionId);
            restored = true;
          }
        } catch {}
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
    loadProducts,
    purchase,
    restore,
  };
}
