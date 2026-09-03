const CACHE_NAME = 'ai-irrigation-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

// Install Service Worker and cache essential static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker and clear stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept network requests and serve from cache using Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Skip dynamic API requests (which are handled via LocalStorage in components)
  if (url.pathname.startsWith('/api') || url.pathname.includes('/farmer/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Cache static chunks, assets, and language files
        const responseToCache = networkResponse.clone();
        const isStaticAsset = 
          url.pathname.includes('_next/static') || 
          url.pathname.includes('/icons/') ||
          url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|json|ico|woff2|woff)$/);

        if (isStaticAsset) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Handle incoming Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      const notification = payload.notification;
      
      const options = {
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/icon-192x192.png',
        data: {
          url: notification.data?.url || '/dashboard'
        }
      };
      
      const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: 'notification-received', payload });
        }
      });
      
      event.waitUntil(
        Promise.all([
          self.registration.showNotification(notification.title, options),
          broadcastPromise
        ])
      );
    } catch (e) {
      const text = event.data.text();
      const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: 'notification-received', payload: text });
        }
      });
      
      event.waitUntil(
        Promise.all([
          self.registration.showNotification('AgriSmart Pro Alert', {
            body: text,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            data: { url: '/dashboard' }
          }),
          broadcastPromise
        ])
      );
    }
  }
});

// Handle notification click (deep linking)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // If client is already open, navigate it or focus it
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
