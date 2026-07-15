/* DramaScore service worker.
 *
 * Strategy — deliberately minimal:
 *  - navigations: network-first, /offline fallback. HTML is NEVER cached
 *    (pages are session-personalized; caching logged-in HTML is a privacy
 *    and staleness footgun).
 *  - /_next/static + icons: cache-first (content-hashed / immutable).
 *  - /api/* (NextAuth, mutations), non-GET, cross-origin: never intercepted.
 *
 * Bump VERSION on any logic change — activate cleans up older caches.
 */
const VERSION = "v1";
const CACHE = `dramascore-${VERSION}`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("dramascore-") && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function cacheFirst(request) {
  return caches.match(request).then(
    (hit) =>
      hit ||
      fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      })
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg"
  ) {
    event.respondWith(cacheFirst(request));
  }
  // Everything else: passthrough (no respondWith).
});
