// A service worker to enable offline use of Hurmet.org

const cacheName = "hurmet-2024-01-30"

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName));
});

function cleanResponse(response) {
  const clonedResponse = response.clone();

  // Not all browsers support the Response.body stream, so fall back to reading
  // the entire body into memory as a blob.
  const bodyPromise = 'body' in clonedResponse ?
    Promise.resolve(clonedResponse.body) :
    clonedResponse.blob();

  return bodyPromise.then((body) => {
    // new Response() is happy when passed either a stream or a Blob.
    return new Response(body, {
      headers: clonedResponse.headers,
      status: clonedResponse.status,
      statusText: clonedResponse.statusText
    });
  });
}

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(cacheName)
  await cache.addAll(resources)
}

// Pre-cache the offline page, JavaScript, CSS, and fonts.
self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      'https://hurmet.org/offline.html',
      'https://hurmet.org/prosemirror.min.js',
      'https://hurmet.org/styles.min.css',
      'https://hurmet.org/latinmodernmath.woff2',
      'https://hurmet.org/Temml.woff2'
    ])
  )
})

// The purpose of this worker is to enable offline use, not primarily to speed startup.
// Hurmet is in active development and I always want to load the most current JS.
// So go to the network first. If network is unavailable, get the cache.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    // Open the cache
    event.respondWith(caches.open(cacheName).then((cache) => {
      // Go to the network first
      return fetch(event.request.url).then((fetchedResponse) => {
        cache.put(event.request, cleanResponse(fetchedResponse));
        return fetchedResponse;
      }).catch(() => {
        // If the network is unavailable, get
        return cache.match('https://hurmet.org/offline.html');
      });
    }));
  } else if (event.request.destination === 'script' || event.request.destination === 'style') {
    // This also calls for network first. Open the cache.
    event.respondWith(caches.open(cacheName).then((cache) => {
      // Go to the network first
      return fetch(event.request.url).then((fetchedResponse) => {
        cache.put(event.request, fetchedResponse.clone());
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
          // Add the network response to the cache for later visits
          cache.put(event.request, fetchedResponse.clone());

          // Return the network response
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
