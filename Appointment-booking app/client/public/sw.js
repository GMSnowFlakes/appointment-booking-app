/* ─────────────────────────────────────────────
   AppointmentBook — Service Worker
   ─────────────────────────────────────────────
   Cache strategy: Cache-First for static assets,
   Network-First for API calls, Network-Only for
   navigation to ensure fresh content.
   ───────────────────────────────────────────── */

const CACHE_NAME = 'apptbook-v1';
const STATIC_CACHE = 'apptbook-static-v1';

// Core assets to pre-cache on install
// Note: Vite bundles source files into hashed dist/ assets in production,
// so we only pre-cache static files that have fixed URLs.
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.png',
];

// ─── Install ──────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls and uploads — Network First with cache fallback
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Vite HMR and dev-only requests — Network Only
  if (url.pathname.startsWith('/@') || url.hostname === 'localhost' && !url.pathname.startsWith('/src/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets — Network First for scripts (avoids stale JS on deploy),
  // Cache First for styles, fonts, and images
  if (request.destination === 'script') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (request.destination === 'style' || request.destination === 'font' || request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation — Network First (fresh content, cached fallback)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else — Network First
  event.respondWith(networkFirst(request));
});

// ─── Strategies ───────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // For navigation, serve the cached shell
    if (request.mode === 'navigate') {
      const shell = await caches.match('/');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503 });
  }
}
