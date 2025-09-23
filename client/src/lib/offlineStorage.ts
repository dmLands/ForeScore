// IndexedDB utilities for offline data storage
class OfflineStorage {
  private dbName = 'ForeScoreOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  // Store names for different types of offline data
  private stores = {
    scores: 'offline_scores',
    gameState: 'offline_game_state',
    metadata: 'offline_metadata'
  };

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(this.stores.scores)) {
          const scoresStore = db.createObjectStore(this.stores.scores, { keyPath: 'id', autoIncrement: true });
          scoresStore.createIndex('gameId', 'gameId', { unique: false });
          scoresStore.createIndex('timestamp', 'timestamp', { unique: false });
          scoresStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.stores.gameState)) {
          const gameStateStore = db.createObjectStore(this.stores.gameState, { keyPath: 'gameId' });
          gameStateStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.stores.metadata)) {
          db.createObjectStore(this.stores.metadata, { keyPath: 'key' });
        }
      };
    });
  }

  // Store offline score entry
  async storeOfflineScore(scoreData: {
    gameId: string;
    playerId: string;
    cardAssignment?: string;
    pointsScore?: number;
    hole?: number;
    timestamp: number;
    type: 'card' | 'points' | 'bbb';
    synced: boolean;
  }): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.scores], 'readwrite');
      const store = transaction.objectStore(this.stores.scores);
      
      const request = store.add(scoreData);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all unsynced scores
  async getUnsyncedScores(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.scores], 'readonly');
      const store = transaction.objectStore(this.stores.scores);
      const index = store.index('synced');
      
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Mark scores as synced
  async markScoresSynced(scoreIds: number[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.scores], 'readwrite');
      const store = transaction.objectStore(this.stores.scores);
      
      let completed = 0;
      let hasError = false;

      scoreIds.forEach(id => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const record = getRequest.result;
            record.synced = true;
            
            const putRequest = store.put(record);
            putRequest.onsuccess = () => {
              completed++;
              if (completed === scoreIds.length && !hasError) {
                resolve();
              }
            };
            putRequest.onerror = () => {
              hasError = true;
              reject(putRequest.error);
            };
          }
        };
        getRequest.onerror = () => {
          hasError = true;
          reject(getRequest.error);
        };
      });
    });
  }

  // Store offline game state backup
  async storeGameState(gameId: string, gameState: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.gameState], 'readwrite');
      const store = transaction.objectStore(this.stores.gameState);
      
      const data = {
        gameId,
        gameState,
        timestamp: Date.now()
      };
      
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get offline game state
  async getGameState(gameId: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.gameState], 'readonly');
      const store = transaction.objectStore(this.stores.gameState);
      
      const request = store.get(gameId);
      request.onsuccess = () => resolve(request.result?.gameState || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Store metadata (like last sync time, offline mode state)
  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.metadata], 'readwrite');
      const store = transaction.objectStore(this.stores.metadata);
      
      const data = { key, value, timestamp: Date.now() };
      
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get metadata
  async getMetadata(key: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.metadata], 'readonly');
      const store = transaction.objectStore(this.stores.metadata);
      
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all offline data (for reset/logout)
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(Object.values(this.stores), 'readwrite');
      
      let completed = 0;
      const storeNames = Object.values(this.stores);
      
      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === storeNames.length) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();

// Network status utilities
export const networkUtils = {
  isOnline: () => navigator.onLine,
  
  onOnline: (callback: () => void) => {
    window.addEventListener('online', callback);
    return () => window.removeEventListener('online', callback);
  },
  
  onOffline: (callback: () => void) => {
    window.addEventListener('offline', callback);
    return () => window.removeEventListener('offline', callback);
  }
};