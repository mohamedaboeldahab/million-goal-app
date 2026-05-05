const CACHE = 'shark-fast-v3';

// 1. تثبيت الـ Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll([
            '/',
            '/index.html',
            '/app.js',
            '/home.html'
        ]))
    );
    self.skipWaiting();
});

// 2. تنظيف الكاش القديم عند التفعيل
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(k => 
            Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))
        ).then(() => self.clients.claim())
    );
});

// 3. التعامل الذكي مع الطلبات (Fetch)
self.addEventListener('fetch', e => {
    const url = e.request.url;

    // استثناء طلبات Firebase Storage و Google APIs من الـ Service Worker
    // ده بيحل مشكلة الـ TypeError: Failed to fetch وقت الرفع
    if (url.includes('firebasestorage.googleapis.com') || url.includes('googleapis.com')) {
        return; // سيب الطلب يمر مباشرة للسيرفر بدون تدخل
    }

    e.respondWith(
        caches.match(e.request).then(r => {
            // إذا كان الملف موجود في الكاش رجعه، غير كده اطلبه من الشبكة
            return r || fetch(e.request).catch(() => {
                // اختياري: ممكن ترجع صفحة offline هنا لو الفيتش فشل تماماً
            });
        })
    );
});
