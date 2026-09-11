/* ══════════════════════════════════════════
   FitTakip — sw.js  (Service Worker)
   Güncelleme yaparken CACHE_NAME'i artır:
   fit-takip-v1 → v2 → v3 → ...
   ══════════════════════════════════════════ */

var CACHE_NAME = 'fit-takip-v3';

var STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ── INSTALL ──────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return Promise.all(
          STATIC_ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Cache eklenemedi:', url, err);
            });
          })
        );
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE ─────────────────────────────────
// Eski cache'leri sil — localStorage'a KESİNLİKLE DOKUNMAZ
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys
            .filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) {
              console.log('[SW] Eski cache siliniyor:', key);
              return caches.delete(key);
            })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

// ── FETCH (Cache-First) ───────────────────────
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(function(networkResponse) {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type !== 'opaque'
            ) {
              var clone = networkResponse.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, clone);
              });
            }
            return networkResponse;
          })
          .catch(function() {
            return caches.match('./index.html');
          });
      })
  );
});
