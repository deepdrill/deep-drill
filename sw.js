/* ═══════════════════════════════════════════
   Deep Drill — Service Worker  v1.0
   يخزّن الصفحات للعمل أوفلاين ويسرّع التحميل
═══════════════════════════════════════════ */

const CACHE_NAME  = 'deep-drill-v1';
const BLOG_ORIGIN = 'https://deep1drill.blogspot.com';

/* ── الملفات المحفوظة فور تثبيت الـ SW ── */
const PRECACHE_URLS = [
  BLOG_ORIGIN + '/',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
];

/* ════ Install ════ */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

/* ════ Activate — احذف الكاش القديم ════ */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k)   { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

/* ════ Fetch — Network First, fallback Cache ════ */
self.addEventListener('fetch', function(event) {
  var req = event.request;

  /* تجاهل غير GET وغير HTTPS */
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('https://')) return;

  /* تجاهل Analytics وـ Adsense وغيرها */
  var skip = ['google-analytics', 'googletagmanager', 'doubleclick',
               'googlesyndication', 'blogger.com/navbar'];
  if (skip.some(function(s){ return req.url.includes(s); })) return;

  event.respondWith(
    fetch(req)
      .then(function(networkRes) {
        /* خزّن نسخة في الكاش */
        if (networkRes && networkRes.status === 200) {
          var clone = networkRes.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return networkRes;
      })
      .catch(function() {
        /* انقطع الإنترنت — ارجع من الكاش */
        return caches.match(req).then(function(cached) {
          if (cached) return cached;
          /* إذا مش موجود في الكاش — ارجع الصفحة الرئيسية */
          if (req.destination === 'document') {
            return caches.match(BLOG_ORIGIN + '/');
          }
          return new Response('', { status: 503 });
        });
      })
  );
});
