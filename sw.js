// A simple service worker for PWA functionality

const CACHE_NAME = 'kids-curated-feed-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
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