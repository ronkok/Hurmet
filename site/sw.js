// A service worker to enable offline use of Hurmet.org

const cacheName = "hurmet-2024-01-29"

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName));
});

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(cacheName)
  await cache.addAll(resources)
}

// Pre-cache the offline page, JavaScript, CSS, and fonts.
self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      'https://hurmet.org/',
      'https://hurmet.org/manual.html',
      'https://hurmet.org/sample.html',
      'https://hurmet.org/prosemirror.min.js',
      'https://hurmet.org/demo.min.js',
      'https://hurmet.org/styles.min.css',
      'https://hurmet.org/docStyles.min.css',
      'https://hurmet.org/latinmodernmath.woff2',
      'https://hurmet.org/Temml.woff2'
    ])
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.open(cacheName).then((cache) => {
    // Go to the cache first
    return cache.match(event.request.url).then((cachedResponse) => {
      // Return a cached response if we have one
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, hit the network
      return fetch(event.request).then((fetchedResponse) => {
        // Add the network response to the cache for later visits
        cache.put(event.request, fetchedResponse.clone());
        // Return the network response
        return fetchedResponse;
      })
    })
  }))
});

self.addEventListener('activate', (event) => {
  // Specify allowed cache keys
  const cacheAllowList = [cacheName];

  // Get all the currently active `Cache` instances.
  event.waitUntil(caches.keys().then((keys) => {
    // Delete all caches that aren't in the allow list:
    return Promise.all(keys.map((key) => {
      if (!cacheAllowList.includes(key)) {
        return caches.delete(key);
      }
    }));
  }));
});
