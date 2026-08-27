// Minimal service worker: no caching strategy, just enough for the browser to consider the
// PWA installable (Chrome's `beforeinstallprompt` heuristics require a registered service
// worker with a fetch handler on top of a valid manifest — see app/manifest.ts).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally a no-op: requests fall through to the network as normal.
});
