// A service worker to enable offline use of Hurmet.app

const cacheName = "hurmet-2024-06-21"

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(cacheName)
  await cache.addAll(resources)
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

// Take a navigation response and replace it with one whose `redirected` value is false.
const cleanResponse = response => {
  return new Response(response.body, {
    bodyUsed: false,
    headers: response.headers,
    ok: true,
    redirected: false,
    status: 200,
    statusText: "",
    type: "basic",
    url: response.url
  })
}

// The purpose of this worker is to enable offline use, not to speed startup.
// Hurmet is in active development and I always want to load the most current JS.
// So, in most cases, go to the network first. If network is unavailable, get the cache.
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    // Open the cache
    event.respondWith(caches.open(cacheName).then(cache => {
      // Go to the network first
      return fetch(event.request.url).then(fetchedResponse => {
        return cleanResponse(fetchedResponse)
      }).catch(() => {
        // If the network is unavailable, put up the offline page
        return cache.match('/offline.html').then(response => cleanResponse(response))
      });
    }));
  } else if (event.request.destination === 'script' || event.request.destination === 'style') {
    // This also calls for network first. Open the cache.
    event.respondWith(caches.open(cacheName).then(cache => {
      // Go to the network first
      return fetch(event.request.url).then(fetchedResponse => {
        return fetchedResponse;
      }).catch(() => {
        // If the network is unavailable, get the cached version
        return cache.match(event.request.url)
      });
    }));
  } else if (event.request.destination === 'font') {
    // Fonts are the only files for which we go cache-first.
    event.respondWith(caches.open(cacheName).then(cache => {
      // Go to the cache
      return cache.match(event.request.url).then(cachedResponse => {
        // Return a cached response if we have one
        if (cachedResponse) {
          return cachedResponse;
        }
        // Otherwise, hit the network
        return fetch(event.request).then(fetchedResponse => {
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
