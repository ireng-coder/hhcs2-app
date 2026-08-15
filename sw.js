// Minimal service worker — its only job is to exist and be "active",
// which is what Chrome/Edge require before they'll show the desktop
// "Install App" button. It intentionally does no caching, so it can't
// accidentally serve stale versions of the app; every request just goes
// straight to the network as normal.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op: let the browser handle every request normally.
});
