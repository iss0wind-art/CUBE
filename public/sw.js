// Minimal service worker: makes CUBE installable as a PWA.
// (Offline shell caching comes later — terminals need the server anyway.)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // network passthrough
});
