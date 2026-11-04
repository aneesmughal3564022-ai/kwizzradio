// KWIZZ Radio Service Worker
// Caches static assets only; NEVER caches the live stream or dynamic SSE

const CACHE_NAME = 'kwizz-static-v2';
const STATIC_ASSETS = [
  '/',
  '/css/tailwind.css',
  '/js/player.js',
  '/js/navigation.js',
  '/js/sse-client.js',
  '/js/theme.js',
  '/images/fallback-album.svg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL RULE (PRD 7.4): NEVER cache the live audio stream, SSE stream, or admin area
  if (
    url.pathname.includes('.mp3') ||
    url.pathname.includes('/stream') ||
    url.pathname.startsWith('/admin') ||
    url.hostname.includes('live365') ||
    url.hostname.includes('cdnstream') ||
    event.request.method !== 'GET'
  ) {
    // Pure network pass-through
    return;
  }

  // Network-first strategy with cache fallback for static pages & assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for static CSS/JS/SVG
        if (
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/') || url.pathname.startsWith('/images/'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push Notification Event
self.addEventListener('push', (event) => {
  let data = {
    title: 'KWIZZ Radio Ottawa',
    body: 'Tune in to live reggae and dancehall now!',
    icon: '/images/fallback-album.svg',
    url: '/listen'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {}

  const options = {
    body: data.body,
    icon: data.icon || '/images/fallback-album.svg',
    badge: '/images/fallback-album.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/listen';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

