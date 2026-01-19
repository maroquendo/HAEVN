// A simple service worker for PWA functionality

// HAEVN Service Worker - Offline First
const CACHE_NAME = 'haevn-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function (response) {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function (cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // If fetch fails (offline), try to return a fallback or the index page
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Listen for push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: "New Notification", body: "Something new happened!" };

  const options = {
    body: data.body,
    icon: 'https://www.gstatic.com/images/branding/product/1x/gtech_moviestudio_128dp.png', // Default icon
    badge: 'https://www.gstatic.com/images/branding/product/1x/gtech_moviestudio_64dp.png' // Icon for notification bar
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});