// SmartBoitage PRO - Service Worker
// Provides offline support and caching for PWA

const CACHE_NAME = 'smartboitage-v1';
const RUNTIME_CACHE = 'smartboitage-runtime-v1';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching files');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
              );
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - network first, then cache, with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network only (no caching for dynamic data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return error response if offline
        return new Response(
          JSON.stringify({ error: 'Offline - API unavailable' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // For navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try to get from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // Return offline page
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // For static assets - cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.error('[Service Worker] Fetch failed:', error);
          throw error;
        });
    })
  );
});

// Background sync for offline data submission
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-tour-progress') {
    event.waitUntil(syncTourProgress());
  }
});

async function syncTourProgress() {
  // Get pending tour updates from IndexedDB
  // Send to server when back online
  console.log('[Service Worker] Syncing tour progress...');

  // Implementation would fetch from IndexedDB and POST to API
  // For now, just log
  return Promise.resolve();
}

// Push notifications (optional - for future use)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');

  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification('SmartBoitage PRO', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Message handler for communication with clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(urls);
      })
    );
  }
});

console.log('[Service Worker] Loaded');
