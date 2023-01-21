// A service worker to enable offline use of Hurmet.app

const version = "hurmet-2023-01-21"

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(version)
  await cache.addAll(resources)
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      '/examples.html',
      '/manual.html',
      '/unit-definitions.html',
      '/offline.html',
      '/styles.min.css',
      '/docStyles.min.css',
      '/demo.min.js',
      '/prosemirror.min.js',
      '/latinmodernmath.woff2',
      '/Temml.woff2',
      '/manifest.json',
      '/favicon.svg',
      '/favicon-192.png',
      '/favicon-512.png'
    ])
  )
})

const homeRegEx = /hurmet\.app\/$/

self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async() => {
      if (!navigator.onLine) {
        console.log("offline")
        if (homeRegEx.test(e.request.url)) {
          const offline = await caches.match("/offline/")
          if (offline) { return offline }
        }
      }
      const r = await caches.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (r) {
        return r;
      }
      const response = await fetch(e.request);
      const cache = await caches.open(version);
      console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
      cache.put(e.request, response.clone());
      return response;
    })()
  );
});

const deleteCache = async(key) => {
  await caches.delete(key)
}

const deleteOldCaches = async() => {
  const cacheKeepList = [version];
  const keyList = await caches.keys()
  const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key))
  await Promise.all(cachesToDelete.map(deleteCache))
}

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches())
})
