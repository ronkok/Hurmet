// A service worker to enable offline use of Hurmet.app

const version = "hurmet-2023-01-19-04"

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(version)
  await cache.addAll(resources)
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      '/',
      '/examples.html',
      '/manual.html',
      '/unit-definitions.html',
      '/offline.html',
      '/styles.min.css',
      '/docStyles.min.css',
      '/demo.min.js',
      '/prosemirror.min.js',
      '/latinmodernmath.woff2',
      '/Temml.woff2'
    ])
  )
})

self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async() => {
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

/*
const cacheFirst = async(request) => {
  const responseFromCache = await caches.match(request)
  if (responseFromCache) {
    return responseFromCache
  }
  return fetch(request)
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') { return }
  event.respondWith(cacheFirst(event.request))

  if (event.request.mode === 'navigate') {
    console.log(event.request)
    event.respondWith((async() => {
      try {
        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch (error) {
        console.log(error)
        const cache = await caches.open(version);
        const cachedResponse = await cache.match("/offline.html");
        return cachedResponse;
      }
    })());
  } else {
    event.respondWith(cacheFirst(event.request))
  }
})
*/

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
