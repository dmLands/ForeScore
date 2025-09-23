import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { offlineStorage, networkUtils } from '@/lib/offlineStorage';
import { apiRequest } from '@/lib/queryClient';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const cleanupOnline = networkUtils.onOnline(handleOnline);
    const cleanupOffline = networkUtils.onOffline(handleOffline);

    return () => {
      cleanupOnline();
      cleanupOffline();
    };
  }, []);

  // Check pending scores count
  const updatePendingCount = useCallback(async () => {
    try {
      const unsyncedScores = await offlineStorage.getUnsyncedScores();
      setPendingCount(unsyncedScores.length);
    } catch (error) {
      console.error('Error checking pending scores:', error);
    }
  }, []);

  // Sync offline data when coming back online
  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      const unsyncedScores = await offlineStorage.getUnsyncedScores();
      
      if (unsyncedScores.length === 0) {
        setPendingCount(0);
        return;
      }

      console.log(`Syncing ${unsyncedScores.length} offline scores...`);
      
      // Group scores by game and type for efficient syncing
      const scoresByGame = unsyncedScores.reduce((acc: Record<string, any[]>, score: any) => {
        const key = `${score.gameId}-${score.type}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(score);
        return acc;
      }, {} as Record<string, any[]>);

      const syncedIds: number[] = [];

      // Sync each group
      for (const [gameKey, scores] of Object.entries(scoresByGame)) {
        const [gameId, type] = gameKey.split('-');
        
        try {
          if (type === 'card') {
            // Sync card assignments
            for (const score of scores) {
              await apiRequest('POST', '/api/offline-sync/card-assignment', {
                gameId: score.gameId,
                playerId: score.playerId,
                cardType: score.cardAssignment,
                timestamp: score.timestamp
              });
              syncedIds.push(score.id);
            }
          } else if (type === 'points' || type === 'bbb') {
            // Sync points/BBB scores
            for (const score of scores) {
              await apiRequest('POST', '/api/offline-sync/points-score', {
                gameId: score.gameId,
                playerId: score.playerId,
                hole: score.hole,
                points: score.pointsScore,
                gameType: type,
                timestamp: score.timestamp
              });
              syncedIds.push(score.id);
            }
          }
        } catch (error) {
          console.error(`Error syncing ${type} scores for game ${gameId}:`, error);
          // Continue with other scores even if some fail
        }
      }

      // Mark successfully synced scores
      if (syncedIds.length > 0) {
        await offlineStorage.markScoresSynced(syncedIds);
        toast({
          title: "Sync Complete",
          description: `${syncedIds.length} offline scores have been synced.`,
          variant: "default"
        });
      }

      await updatePendingCount();
    } catch (error) {
      console.error('Error syncing offline data:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync some offline data. Will retry automatically.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, toast, updatePendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      // Delay sync slightly to ensure connection is stable
      const timer = setTimeout(syncOfflineData, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncOfflineData, isSyncing]);

  // Initialize offline storage and check pending count
  useEffect(() => {
    const initializeOfflineStorage = async () => {
      try {
        await offlineStorage.init();
        await updatePendingCount();
      } catch (error) {
        console.error('Error initializing offline storage:', error);
      }
    };

    initializeOfflineStorage();
  }, [updatePendingCount]);

  // Store offline score entry
  const storeOfflineScore = useCallback(async (scoreData: {
    gameId: string;
    playerId: string;
    cardAssignment?: string;
    pointsScore?: number;
    hole?: number;
    type: 'card' | 'points' | 'bbb';
  }) => {
    try {
      await offlineStorage.storeOfflineScore({
        ...scoreData,
        timestamp: Date.now(),
        synced: false
      });
      
      await updatePendingCount();
      
      toast({
        title: "Score Saved Offline",
        description: "Your score has been saved and will sync when connection returns.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error storing offline score:', error);
      toast({
        title: "Save Error",
        description: "Failed to save score offline. Please try again.",
        variant: "destructive"
      });
    }
  }, [updatePendingCount, toast]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    storeOfflineScore,
    syncOfflineData,
    updatePendingCount
  };
}