const CACHE_NAME = 'forescore-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // Static assets are cached automatically by Vite
];

const OFFLINE_STORAGE_KEY = 'forescore-offline-data';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then(response => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle API requests with offline support
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);
    
    // If successful, process and return
    if (response.ok) {
      await handleAPIResponse(request, response.clone());
      return response;
    }
    
    // If not ok, try offline fallback
    return await getOfflineResponse(request);
  } catch (error) {
    console.log('API request failed, checking offline storage:', error);
    return await getOfflineResponse(request);
  }
}

// Handle successful API responses
async function handleAPIResponse(request, response) {
  const url = new URL(request.url);
  
  // Store score data for offline access
  if (url.pathname.includes('/api/points-games/') && request.method === 'GET') {
    const data = await response.json();
    await storeOfflineData('points-games', data);
  }
  
  // Store group data for offline access
  if (url.pathname.includes('/api/groups') && request.method === 'GET') {
    const data = await response.json();
    await storeOfflineData('groups', data);
  }
}

// Get offline response for failed API requests
async function getOfflineResponse(request) {
  const url = new URL(request.url);
  
  // Return cached data if available
  if (url.pathname.includes('/api/points-games/')) {
    const offlineData = await getOfflineData('points-games');
    if (offlineData) {
      return new Response(JSON.stringify(offlineData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  if (url.pathname.includes('/api/groups')) {
    const offlineData = await getOfflineData('groups');
    if (offlineData) {
      return new Response(JSON.stringify(offlineData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Return error response for other API calls
  return new Response(
    JSON.stringify({ error: 'Offline - data not available' }),
    { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Store data for offline use
async function storeOfflineData(key, data) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      `offline://${key}`,
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (error) {
    console.error('Failed to store offline data:', error);
  }
}

// Retrieve offline data
async function getOfflineData(key) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(`offline://${key}`);
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to retrieve offline data:', error);
  }
  return null;
}

// Background sync for offline score entry
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'score-sync') {
    event.waitUntil(syncScores());
  }
});

// Sync offline scores when connectivity returns
async function syncScores() {
  try {
    const offlineScores = await getOfflineData('pending-scores');
    if (!offlineScores || offlineScores.length === 0) {
      return;
    }
    
    console.log('Syncing offline scores:', offlineScores);
    
    for (const scoreData of offlineScores) {
      try {
        const response = await fetch('/api/points-games/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(scoreData)
        });
        
        if (response.ok) {
          console.log('Score synced successfully:', scoreData);
        } else {
          console.error('Failed to sync score:', scoreData, response.status);
        }
      } catch (error) {
        console.error('Error syncing score:', error);
        // Keep failed scores for next sync attempt
        break;
      }
    }
    
    // Clear synced scores
    await storeOfflineData('pending-scores', []);
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}