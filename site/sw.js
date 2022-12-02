
// Service worker for Hurmet

const version = 'hurmet_2022-12-02-02';

const assets = [
  'https://hurmet.app/offline.html',
  'https://hurmet.app/prosemirror.min.mjs',
  'https://hurmet.app/styles.min.css',
  'https://hurmet.app/katex.min.css',
  'https://hurmet.app/images/favicon.ico',
  'https://hurmet.app/fonts/KaTeX_AMS-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Caligraphic-Bold.woff2',
  'https://hurmet.app/fonts/KaTeX_Caligraphic-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Fraktur-Bold.woff2',
  'https://hurmet.app/fonts/KaTeX_Fraktur-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Main-Bold.woff2',
  'https://hurmet.app/fonts/KaTeX_Main-BoldItalic.woff2',
  'https://hurmet.app/fonts/KaTeX_Main-Italic.woff2',
  'https://hurmet.app/fonts/KaTeX_Main-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Math-BoldItalic.woff2',
  'https://hurmet.app/fonts/KaTeX_Math-Italic.woff2',
  'https://hurmet.app/fonts/KaTeX_SansSerif-Bold.woff2',
  'https://hurmet.app/fonts/KaTeX_SansSerif-Italic.woff2',
  'https://hurmet.app/fonts/KaTeX_SansSerif-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Script-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Size1-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Size2-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Size3-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Size4-Regular.woff2',
  'https://hurmet.app/fonts/KaTeX_Typewriter-Regular.woff2'
];

self.addEventListener("install", event => {
  console.log("installing...");
  event.waitUntil(
    caches
      .open(version)
      .then(cache => {
        return cache.addAll(assets);
      })
      .catch(err => console.log(err))
  );
});

// On version update, remove old cached files
self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(key) {
      return key !== version
    }).map(function(key) {
      return caches.delete(key);
    }));
  }).then(function() {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", event => {
  if (event.request.url === "https://hurmet.app/") {
    event.respondWith(
      fetch(event.request).catch(err =>
        self.cache.open(version).then(cache => cache.match("https://hurmet.app/offline.html"))
      )
    )
  } else {
    event.respondWith(
      fetch(event.request).catch(err =>
        caches.match(event.request).then(response => response)
      )
    );
  }
});
