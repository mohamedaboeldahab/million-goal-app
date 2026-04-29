self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// ✅ هذا المستمع ضروري لاعتبار الموقع تطبيقاً قابلاً للتثبيت
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
