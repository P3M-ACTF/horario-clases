const CACHE = 'mi-horario-__VERSION__';
const PREFIX = 'mi-horario-';
const ASSETS = __ASSETS__;
const ROOT = new URL('./', self.location.href).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(p => new Request(new URL(p, ROOT), { cache: 'reload' })))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => { for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key); await self.clients.claim(); })());
});
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(ROOT)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), url = new URL(event.request.url);
    // One coherent release (HTML, modules and templates) until the user updates.
    const key = event.request.mode === 'navigate' && (url.pathname === new URL(ROOT).pathname || url.pathname.endsWith('/index.html')) ? new URL('index.html', ROOT).href : event.request;
    const cached = await cache.match(key, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch { return new Response('Recurso no disponible sin conexión.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
  })());
});
