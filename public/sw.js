self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through network request to enable PWA installability without caching stale dynamic data
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
