/* ══════════════════════════════════════════
   FitTakip — sw.js  (Service Worker)
   Güncelleme yaparken CACHE_NAME'i artır:
   fit-takip-v1 → v2 → v3 → v4 → ...
   ══════════════════════════════════════════ */

var CACHE_NAME = 'fit-takip-v51';

var STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './storage.js',
  './utils.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './anatomy/front.svg',
  './anatomy/back.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
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
      .then(function() { return self.skipWaiting(); })
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
      .then(function() { return self.clients.claim(); })
  );
});

// ── PUSH (sunucudan gelen bildirim) ───────────
// Uygulama tamamen kapalıyken de çalışır
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }

  var title = data.title || '⏰ Hatırlatma';
  var options = {
    body: data.body || 'Supplement alma zamanın geldi 💪',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: data.tag || 'supp-push',
    renotify: true,
    vibrate: [120, 60, 120],
    // Hangi takviyenin bildirimi olduğu — tıklanınca uygulama o satıra gidiyor
    data: { page: 'supplement', suppId: data.itemId || null }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Push aboneliği tarayıcı tarafından yenilenirse uygulamaya haber ver
self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        clientList.forEach(function(client) {
          client.postMessage({ type: 'push-subscription-changed' });
        });
      })
  );
});

// ── BİLDİRİME TIKLAMA ─────────────────────────
// Supplement hatırlatmasına dokununca uygulamayı öne getirir
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var suppId = (event.notification.data && event.notification.data.suppId) || '';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Uygulama zaten açıksa: hangi takviye olduğunu söyleyip öne getir
        for (var i = 0; i < clientList.length; i++) {
          if ('focus' in clientList[i]) {
            clientList[i].postMessage({ type: 'supplement-notification', suppId: suppId });
            return clientList[i].focus();
          }
        }
        // Kapalıysa: adrese iliştirip aç, uygulama açılışta okuyor
        if (self.clients.openWindow) {
          return self.clients.openWindow('./' + (suppId ? '?supp=' + encodeURIComponent(suppId) : ''));
        }
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
        if (cachedResponse) return cachedResponse;

        return fetch(event.request)
          .then(function(networkResponse) {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              var clone = networkResponse.clone();
              caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
            }
            return networkResponse;
          })
          .catch(function() { return caches.match('./index.html'); });
      })
  );
});
