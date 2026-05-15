// ============================================================
// EntregaLog Service Worker v1.0.3
// version.json + index.html: NETWORK-FIRST (atualizacao em tempo real)
// APIs externas: NETWORK-FIRST
// Demais estaticos: CACHE-FIRST
// ============================================================

const SW_VERSION = '1.0.3';
const STATIC_CACHE = 'entregalog-static-v' + SW_VERSION;
const RUNTIME_CACHE = 'entregalog-runtime';

const STATIC_ASSETS = [
  './entregalog-icon-192.png',
  './entregalog-icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

const NETWORK_FIRST_HOSTS = [
  'supabase.co',
  'nominatim.openstreetmap.org',
  'viacep.com.br',
  'tile.openstreetmap.org'
];

const ALWAYS_FRESH = [
  '/version.json',
  '/index.html',
  '/manifest.json',
  '/service-worker.js'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return Promise.all(STATIC_ASSETS.map(function (url) {
        return cache.add(url).catch(function (err) {
          console.warn('[SW] Falha ao cachear:', url, err);
        });
      }));
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== STATIC_CACHE && k !== RUNTIME_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isAlwaysFresh(url) {
  return ALWAYS_FRESH.some(function (p) { return url.pathname.endsWith(p); });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (isAlwaysFresh(url) || req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(function (resp) {
          if (resp && resp.ok) {
            var copy = resp.clone();
            caches.open(STATIC_CACHE).then(function (c) { c.put(req, copy); });
          }
          return resp;
        })
        .catch(function () {
          return caches.match(req).then(function (c) {
            return c || caches.match('./index.html');
          });
        })
    );
    return;
  }

  var isNetworkFirst = NETWORK_FIRST_HOSTS.some(function (h) {
    return url.hostname.indexOf(h) !== -1;
  });
  if (isNetworkFirst) {
    event.respondWith(
      fetch(req)
        .then(function (resp) {
          if (url.hostname.indexOf('tile.openstreetmap.org') !== -1 && resp.ok) {
            var copy = resp.clone();
            caches.open(RUNTIME_CACHE).then(function (c) { c.put(req, copy); });
          }
          return resp;
        })
        .catch(function () { return caches.match(req); })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (resp && resp.ok && resp.type !== 'opaque') {
          var copy = resp.clone();
          caches.open(RUNTIME_CACHE).then(function (c) { c.put(req, copy); });
        }
        return resp;
      });
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
    );
  }
});
