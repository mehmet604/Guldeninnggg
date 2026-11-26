const CACHE = 'gulden-v1-4';
const FILES = ['./', './index.html', './style.css?v=14', './app.js?v=14',
  './teachers.js?v=14', './manifest.webmanifest', './vase.webp',
  './icon-180.png', './icon-192.png', './icon-512.png'];
const assets = new Set(FILES.map(file => new URL(file, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('gulden-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !assets.has(event.request.url)) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(event.request) || Response.error();
  }));
});
