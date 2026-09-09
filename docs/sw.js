// Offline caching. The point is that a jog doesn't depend on signal: once a
// chapter has been opened at home, the whole thing — audio included — is on the
// phone.

const CACHE = 'riverbend-v1';

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/engine.js',
  './js/audio.js',
  './js/storage.js',
  './js/packs.js',
  './js/base.js',
  './js/hero.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Individual failures shouldn't sink the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheAndReturn(request, response) {
  // A 206 cannot be stored — cache.put() throws on partial responses, and an
  // unhandled throw here fails the whole request. Audio elements ask for ranges,
  // so this matters: getting it wrong silently breaks chapter playback.
  if (response.status === 200 && !response.headers.has('content-range')) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Story content and audio never change once built, and they're the part that
  // absolutely must work with no signal — so cache wins there. Everything else
  // prefers the network so a code change shows up on the next load.
  const isContent = request.url.includes('/content/');

  event.respondWith(
    (async () => {
      // Cache matching ignores the Range header, so a cached whole file answers a
      // range request too. That's what makes an offline chapter play.
      const cached = await caches.match(request);
      if (isContent && cached) return cached;

      try {
        return await cacheAndReturn(request, await fetch(request));
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })()
  );
});
