// ============================================================
// EntregaLog — Service Worker
// Estratégia: cache-first para assets estáticos, network-first para APIs
// Atualizacao: SKIP_WAITING via postMessage do app
// ============================================================

const SW_VERSION = '1.0.2';
const STATIC_CACHE = 'entregalog-static-v' + SW_VERSION;
const RUNTIME_CACHE = 'entregalog-runtime';

// Recursos do app (shell). Caminhos relativos — o SW está na raiz do site.
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './entregalog-icon-192.png',
  './entregalog-icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Domínios externos que SEMPRE devem ir pra rede (dados ao vivo)
const NETWORK_FIRST_HOSTS = [
  'supabase.co',
  'nominatim.openstreetmap.org',
  'viacep.com.br',
  'tile.openstreetmap.org'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // addAll falha se algum recurso falhar — usar add individual com try
      return Promise.all(STATIC_ASSETS.map((url) => {
        return cache.add(url).catch((err) => {
          console.warn('[SW] Falha ao cachear:', url, err);
        });
      }));
    })
  );
});

// ===== ACTIVATE — limpa caches antigos =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== STATIC_CACHE && k !== RUNTIME_CACHE) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só GET é cacheável
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Network-first para APIs e tiles
  const isNetworkFirst = NETWORK_FIRST_HOSTS.some((h) => url.hostname.includes(h));
  if (isNetworkFirst) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // Cacheia tiles offline-friendly
          if (url.hostname.includes('tile.openstreetmap.org') && resp.ok) {
            const copy = resp.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first para o resto (shell + estáticos)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp && resp.ok && resp.type !== 'opaque') {
            const copy = resp.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return resp;
        })
        .catch(() => {
          // Se for navegação e estiver offline, devolve o index do cache
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ===== MENSAGEM — força atualizar quando o app pede =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
