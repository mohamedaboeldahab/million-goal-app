const CACHE_NAME = 'shark-hub-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/profile.html',
  '/roadmap.html',
  '/style.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
