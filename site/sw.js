// A service worker to enable offline use of Hurmet.app

const version = "hurmet-2023-03-28-2"

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(version)
  await cache.addAll(resources)
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      '/manual.html',
      '/unit-definitions.html',
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

self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async() => {
      const r = await caches.match(e.request);
      if (r) {
        return r;
      }
      const response = await fetch(e.request);
      const cache = await caches.open(version);
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
