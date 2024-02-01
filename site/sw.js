// A service worker to enable offline use of Hurmet.app

const cacheName = "hurmet-2024-02-01"

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(cacheName)
  await cache.addAll(resources)
  self.skipWaiting()
}

// Pre-cache the offline page, JavaScript, CSS, and fonts.
self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      '/offline.html',
      '/prosemirror.min.js',
      '/styles.min.css',
      '/latinmodernmath.woff2',
      '/Temml.woff2'
    ])
  )
})

// The purpose of this worker is to enable offline use, not primarily to speed startup.
// Hurmet is in active development and I always want to load the most current JS.
// So go to the network first. If network is unavailable, get the cache.
self.addEventListener('fetch', (event) => {
  let request = event.request;
  if (request.mode === 'navigate') {
    // The request should have: redirect: 'follow'
    request = new Request(request.url, {
      method: 'GET',
      headers: request.headers,
      mode: 'cors',
      credentials: request.credentials,
      redirect: 'follow'
    })
    event.respondWith(
      fetch(request)
          .then( response => {
            return response;  // network first
          })
          .catch( () => {
            caches.open(cacheName).then((cache) => {
              return cache.match('/offline.html')  // Put up the offline page
            })
          })
        );
    return
  } else if (request.destination === 'script' || request.destination === 'style') {
    // This also calls for network first. Open the cache.
    event.respondWith(caches.open(cacheName).then((cache) => {
      // Go to the network first
      return fetch(request.url).then((fetchedResponse) => {
        return fetchedResponse;
      }).catch(() => {
        // If the network is unavailable, get the cached version
        return cache.match(request.url);
      });
    }));
  } else if (request.destination === 'font') {
    // Get a font from the cache
    event.respondWith(caches.open(cacheName).then((cache) => {
      // Go to the cache first
      return cache.match(request.url).then((cachedResponse) => {
        // Return a cached response if we have one
        if (cachedResponse) {
          return cachedResponse;
        }
        // Otherwise, hit the network
        return fetch(request).then((fetchedResponse) => {
          return fetchedResponse;
        })
      })
    }))
  } else {
    return;
  }
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
