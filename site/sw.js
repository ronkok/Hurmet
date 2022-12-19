
// Service worker for Hurmet

const version = 'hurmet_2022-12-16-10';
// Cache IDs
const coreID = version + '_core';  // offline.html & CSS & fonts
const assetsID = version + '_assets'; // images
const cacheIDs = [coreID, assetsID];

const coreFiles = [
  '/offline.html',
  '/styles.min.css',
  '/docStyles.min.css',
  '/fonts/KaTeX_AMS-Regular.woff2',
  '/fonts/KaTeX_Caligraphic-Bold.woff2',
  '/fonts/KaTeX_Caligraphic-Regular.woff2',
  '/fonts/KaTeX_Fraktur-Bold.woff2',
  '/fonts/KaTeX_Fraktur-Regular.woff2',
  '/fonts/KaTeX_Main-Bold.woff2',
  '/fonts/KaTeX_Main-BoldItalic.woff2',
  '/fonts/KaTeX_Main-Italic.woff2',
  '/fonts/KaTeX_Main-Regular.woff2',
  '/fonts/KaTeX_Math-BoldItalic.woff2',
  '/fonts/KaTeX_Math-Italic.woff2',
  '/fonts/KaTeX_SansSerif-Bold.woff2',
  '/fonts/KaTeX_SansSerif-Italic.woff2',
  '/fonts/KaTeX_SansSerif-Regular.woff2',
  '/fonts/KaTeX_Script-Regular.woff2',
  '/fonts/KaTeX_Size1-Regular.woff2',
  '/fonts/KaTeX_Size2-Regular.woff2',
  '/fonts/KaTeX_Size3-Regular.woff2',
  '/fonts/KaTeX_Size4-Regular.woff2',
  '/fonts/KaTeX_Typewriter-Regular.woff2'
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
  if (request.headers.get('Accept').includes('text/css') ||
      request.headers.get('Accept').includes('font/woff2')) {
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

  // Assets: Images
  // Offline-first, cache as you browse
  if (request.headers.get('Accept').includes('image')) {
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
