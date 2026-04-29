self.addEventListener('install', e => {
  self.skipWaiting();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request) || fetch(e.request));
});
self.addEventListener('activate', e => {
  clients.claim();
});
