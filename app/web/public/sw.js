/* Self-removing service worker.
   This site does not use a service worker. Browsers that had one
   registered for this origin (an older build of the site, or another
   project served on localhost:3000) keep requesting /sw.js, and each
   request rendered the full 404 page. Serving this file lets the old
   registration update to a worker that immediately unregisters itself. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => {
  self.registration.unregister();
});
