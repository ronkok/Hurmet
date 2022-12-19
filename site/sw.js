// A service worker to enable offline use of Hurmet.app

const version = "hurmet-2022-12-19-03"

const coreFiles = [
  '/index.html',
  '/manual.html',
  '/fonts/KaTeX_AMS-Regular.woff2',
  '/fonts/KaTeX_Caligraphic-Regular.woff2',
  '/fonts/KaTeX_Main-Bold.woff2',
  '/fonts/KaTeX_Main-BoldItalic.woff2',
  '/fonts/KaTeX_Main-Italic.woff2',
  '/fonts/KaTeX_Main-Regular.woff2',
  '/fonts/KaTeX_Math-BoldItalic.woff2',
  '/fonts/KaTeX_Math-Italic.woff2',
  '/fonts/KaTeX_Size1-Regular.woff2',
  '/fonts/KaTeX_Size2-Regular.woff2',
  '/fonts/KaTeX_Size3-Regular.woff2',
  '/fonts/KaTeX_Size4-Regular.woff2'
];

self.addEventListener('install', function(event) {
  console.log(version)
  event.waitUntil(caches.open(version).then(function(cache) {
    coreFiles.forEach(function(file) {
      cache.add(new Request(file));
    });
    return cache;
  }));
});

const cacheFirst = async(request) => {
  const responseFromCache = await caches.match(request)
  if (responseFromCache) {
    return responseFromCache
  }
  return fetch(request)
};

self.addEventListener("fetch", (event) => {
  event.respondWith(cacheFirst(event.request))
})

const deleteCache = async(key) => {
  await caches.delete(key)
}

const deleteOldCaches = async() => {
  const cacheKeepList = [version];
  const keyList = await caches.keys()
  const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key))
  await Promise.all(cachesToDelete.map(deleteCache))
};

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches())
})
