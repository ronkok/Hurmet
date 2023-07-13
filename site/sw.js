// A service worker to enable offline use of Hurmet.app

const cacheName = "hurmet-2023-07-13"

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName));
});

const addResourcesToCache = async(resources) => {
  const cache = await caches.open(cacheName)
  await cache.addAll(resources)
}

// Pre-install the offline page.
self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache(['https://hurmet.app/offline.html'])
  )
})

// The purpose of this worker is to enable offline use, not to speed startup.
// Hurmet is in active development and I always want to load the most current JS.
// So go to the network first. If network is unavailable, get the cache.
self.addEventListener('fetch', (event) => {
  // Check if this is a navigation request
  if (event.request.mode === 'navigate') {
    // Open the cache
    event.respondWith(caches.open(cacheName).then((cache) => {
      // Go to the network first
      return fetch(event.request.url).then((fetchedResponse) => {
        cache.put(event.request, fetchedResponse.clone());

        return fetchedResponse;
      }).catch(() => {
        // If the network is unavailable, get
        return cache.match('https://hurmet.app/offline.html');
      });
    }));
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
