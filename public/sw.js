const CACHE = 'sazón-v1';
const STATIC = ['/'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests for same-origin or static assets
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Skip Supabase API calls — always go to network
  if (url.hostname.includes('supabase.co')) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          cache.put(e.request, res.clone());
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
