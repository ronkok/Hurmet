
/* Service worker for Hurmet
 * (c) 2022 Ron Kok | MIT License
 * This file is heavily influenced by
 * https://gomakethings.com/sw.js | (c) 2022 Chris Ferdinandi | MIT License
 */

const version = 'hurmet_2022-05-24-3';
// Cache IDs
const pageID = version + '_pages'; // HTML
const codeID = version + '_code';  // JavaScript & CSS
const assetsID = version + '_assets'; // images, fonts, CSV, & txt
const cacheIDs = [codeID, pageID, assetsID];

const codeFiles = [
  'https://hurmet.app/prosemirror.min.js',
  'https://hurmet.app/hurmet.min.js',
  'https://hurmet.app/styles.min.css',
  'https://hurmet.app/temml/temml.min.js',
  'https://hurmet.app/temml/temml.css',
  'https://hurmet.app/temml/Temml.woff2',
  'https://hurmet.app/katex/katex.min.js',
  'https://hurmet.app/katex/katex.css',
  'https://hurmet.app/docs/demonstration.js'
];


const trimPages = function() {
  // No more than 20 pages in the cache.
  caches.open(pageID).then(function(cache) {
    cache.keys().then(function(keys) {
      if (keys.length <= 20) { return }
      cache.delete(keys[0]).then(function() {
        trimPages();
      });
    });
  });
};

//
// Event Listeners
//

// On install, cache code: Javascript, CSS, & txt
self.addEventListener('install', function(event) {
  self.skipWaiting()
  event.waitUntil(caches.open(codeID).then(function(cache) {
    cache.add(new Request('/offline/'));
    codeFiles.forEach(function(file) {
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

// listen for requests
self.addEventListener('message', event => {
  if (event.data.command === 'trimCaches') {
    trimPages()
  }
});

self.addEventListener('fetch', function(event) {

  // Get the request
  const request = event.request;

  // Ignore non-GET requests
  if (request.method !== 'GET') { return }

  // HTML files
  // Network-first
  if (request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(request).then(function(response) {
        if (response.type !== 'opaque') {
          const copy = response.clone();
          event.waitUntil(caches.open(pageID).then(function(cache) {
            return cache.put(request, copy);
          }));
        }
        return response;
      }).catch(function(error) {
        return caches.match(request).then(function(response) {
          return response || caches.match('/offline/');
        });
      })
    );
    return;
  }

  // Code: CSS & JavaScript
  // Offline-first, pre-cached
  if (request.headers.get('Accept').includes('text/css') ||
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
