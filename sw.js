/**
 * Minimal service worker for JetLagPro PWA.
 * Fixes 404 on registration; supports offline fallback for main doc.
 */
const CACHE_NAME = 'jetlagpro-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL) || new Response('Offline', { status: 503, statusText: 'Offline' }))
  );
});
