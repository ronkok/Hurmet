
/* Service worker for Hurmet
 * (c) 2022 Ron Kok | MIT License
 * This file is heavily influenced by
 * https://gomakethings.com/sw.js | (c) 2022 Chris Ferdinandi | MIT License
 */

const version = 'hurmet_2022-05-27-2';
// Cache IDs
const coreID = version + '_core';  // JavaScript & CSS
const assetsID = version + '_assets'; // images, fonts, CSV, & txt
const cacheIDs = [coreID, assetsID];

const coreFiles = [
  'https://hurmet.app/index.html',
  'https://hurmet.app/examples.html',
  'https://hurmet.app/docs/en/manual.html',
  'https://hurmet.app/docs/en/unit-definitions.html',
  'https://hurmet.app/styles.min.css',
  'https://hurmet.app/temml/temml.css',
  'https://hurmet.app/katex/katex.css'
];

//
// Event Listeners
//

// On install, cache CSS
self.addEventListener('install', function(event) {
  self.skipWaiting()
  event.waitUntil(caches.open(coreID).then(function(cache) {
    cache.add(new Request('/offline/'));
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

  // core: HTML & CSS
  // Offline-first, pre-cached
  if (request.headers.get('Accept').includes('text/html') ||
      request.headers.get('Accept').includes('text/css') ||
      request.headers.get('Accept').includes('text/javascript')) {
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

  // Assets: Images, fonts, csv, & txt
  // Offline-first, cache as you browse
  if (request.headers.get('Accept').includes('image') ||
      request.headers.get('Accept').includes('font/woff2') ||
      request.headers.get('Accept').includes('text/csv') ||
      request.headers.get('Accept').includes('text/plain')) {
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
