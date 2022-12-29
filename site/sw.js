// A service worker to enable offline use of Hurmet.app

const version = "hurmet-2022-12-29"

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(version)
  await cache.addAll(resources)
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      '/offline.html',
      '/styles.min.css',
      '/docStyles.min.css',
      '/demo.min.js',
      '/prosemirror.min.js'
    ])
  )
})

const cacheFirst = async(request) => {
  const responseFromCache = await caches.match(request)
  if (responseFromCache) {
    return responseFromCache
  }
  return fetch(request)
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') { return }

  if (event.request.mode === 'navigate') {
    event.respondWith((async() => {
      try {
        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch (error) {
        const cache = await caches.open(version);
        const cachedResponse = await cache.match("./offline.html");
        return cachedResponse;
      }
    })());
  } else {
    event.respondWith(cacheFirst(event.request))
  }
})

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
