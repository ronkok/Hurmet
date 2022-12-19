
// Service worker for Hurmet

const version = 'hurmet_2022-12-16-11';
// Cache IDs
const coreID = version + '_core';  // offline.html & CSS
const assetsID = version + '_assets'; // images
const cacheIDs = [coreID, assetsID];

const coreFiles = [
  '/offline.html',
  '/styles.min.css',
  '/docStyles.min.css'
];

//
// Event Listeners
//

// On install, cache the core files
self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(coreID).then(function(cache) {
    coreFiles.forEach(function(file) {
      cache.add(new Request(file));
    });
    return cache;
  }));
});

// On version update, remove old cached files
self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(key) {
      return !cacheIDs.includes(key);
    }).map(function(key) {
      return caches.delete(key);
    }));
  }).then(function() {
    return self.clients.claim();
  }));
});

self.addEventListener('fetch', function(event) {

  // Get the request
  const request = event.request;

  // Ignore non-GET requests
  if (request.method !== 'GET') { return }

  // CSS
  // Offline-first, pre-cached
  if (request.headers.get('Accept').includes('text/css')) {
    event.respondWith(
      caches.match(request).then(function(response) {
        return response || fetch(request).then(function(response) {

          // Return the response
          return response;

        });
      })
    );
    return;
  }

  // HTML from network
  if (event.request.mode === 'navigate') {
    event.respondWith((async() => {
      try {
        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch (error) {
        // catch is only triggered if an exception is thrown, which is likely
        // due to a network error.
        const cache = await caches.open(coreID);
        const cachedResponse = await cache.match("./offline.html");
        return cachedResponse;
      }
    })());
  }

  // Assets: Images & fonts
  // Offline-first, cache as you browse
  if (request.headers.get('Accept').includes('image') ||
      request.headers.get('Accept').includes('font/woff2')) {
    event.respondWith(
      caches.match(request).then(function(response) {
        return response || fetch(request).then(function(response) {

          const copy = response.clone();
          event.waitUntil(caches.open(assetsID).then(function(cache) {
            return cache.put(request, copy);
          }));

          // Return the requested file
          return response;

        });
      })
    );
  }

});
