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

async function cleanRedirect(response) {
  const clonedResponse = response.clone();

  // Not all browsers support the Response.body stream, so fall back
  // to reading the entire body into memory as a blob.
  const bodyPromise = 'body' in clonedResponse
    ? Promise.resolve(clonedResponse.body)
    : clonedResponse.blob()

  const body = await bodyPromise

  // new Response() is happy when passed either a stream or a Blob.
  return new Response(body, {
    headers: clonedResponse.headers,
    status: clonedResponse.status,
    statusText: clonedResponse.statusText
  });
}

// The purpose of this worker is to enable offline use, not primarily to speed startup.
// Hurmet is in active development and I always want to load the most current JS.
// So go to the network first. If network is unavailable, get the cache.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    // Open the cache
    event.respondWith(caches.open(cacheName).then((cache) => {
      if (!navigator.onLine) {
        // Put up the offline page
        let response = cache.match('/offline.html')
        console.log(response)
        response = cleanRedirect(response)
        return response
      }
      // Else go to the network
      return fetch(event.request.url).then((fetchedResponse) => {
        return fetchedResponse;
      })
    }));
  } else if (event.request.destination === 'script' || event.request.destination === 'style') {
    // This also calls for network first. Open the cache.
    event.respondWith(caches.open(cacheName).then((cache) => {
      // Go to the network first
      return fetch(event.request.url).then((fetchedResponse) => {
        return fetchedResponse;
      }).catch(() => {
        // If the network is unavailable, get the cached version
        return cache.match(event.request.url);
      });
    }));
  } else if (event.request.destination === 'font') {
    // Get a font from the cache
    event.respondWith(caches.open(cacheName).then((cache) => {
      // Go to the cache first
      return cache.match(event.request.url).then((cachedResponse) => {
        // Return a cached response if we have one
        if (cachedResponse) {
          return cachedResponse;
        }
        // Otherwise, hit the network
        return fetch(event.request).then((fetchedResponse) => {
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
