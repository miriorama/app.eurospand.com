var GHPATH = '';
var APP_PREFIX = 'eurospand-';
var VERSION = 'v=0.10';
var URLS = [
    `${GHPATH}/`,
    `${GHPATH}/index.html`,
    `${GHPATH}/css/style.css`,
    `${GHPATH}/js/app.min.js`,
    `${GHPATH}/js/data.min.js`,
    `${GHPATH}/js/lang.min.js`,
    `${GHPATH}/manifest.json`,
    `${GHPATH}/lang/it.js`,

    `${GHPATH}/fonts/roboto-condensed-v25-latin-300.woff`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-300.woff2`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-300italic.woff`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-300italic.woff2`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-700.woff`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-700.woff2`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-700italic.woff`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-700italic.woff2`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-italic.woff`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-italic.woff2`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-regular.woff`,
    `${GHPATH}/fonts/roboto-condensed-v25-latin-regular.woff2`,

    `${GHPATH}/img/icon.svg`,
    `${GHPATH}/img/icon-192.png`,
    `${GHPATH}/img/logo-full.svg`,
    `${GHPATH}/img/logo.svg`,
    `${GHPATH}/img/index-background.jpg`,

    `${GHPATH}/img/concime-type/fertilizzanti.jpg`,
    `${GHPATH}/img/concime-type/lumachicida.jpg`,
    `${GHPATH}/img/concime-type/semi.jpg`,

    `${GHPATH}/img/icons/arrow-right.svg`,
    `${GHPATH}/img/icons/check.svg`,
    `${GHPATH}/img/icons/chevron-right-white.svg`,
    `${GHPATH}/img/icons/chevron-right.svg`,
    `${GHPATH}/img/icons/close-white.svg`,
    `${GHPATH}/img/icons/close.svg`,
    `${GHPATH}/img/icons/conversion.svg`,
    `${GHPATH}/img/icons/flow-factor.svg`,
    `${GHPATH}/img/icons/flower-white.svg`,
    `${GHPATH}/img/icons/flower.svg`,
    `${GHPATH}/img/icons/funnel-white.svg`,
    `${GHPATH}/img/icons/funnel.svg`,
    `${GHPATH}/img/icons/home.svg`,
    `${GHPATH}/img/icons/info-white.svg`,
    `${GHPATH}/img/icons/info.svg`,
    `${GHPATH}/img/icons/list-result-white.svg`,
    `${GHPATH}/img/icons/list-result.svg`,
    `${GHPATH}/img/icons/menu.svg`,
    `${GHPATH}/img/icons/opening.svg`,
    `${GHPATH}/img/icons/slider-white.svg`,
    `${GHPATH}/img/icons/slider.svg`,
    `${GHPATH}/img/icons/square.svg`,

    `${GHPATH}/img/machine/apollo-galileo.jpg`,
    `${GHPATH}/img/machine/david-compact-fruit.jpg`,
    `${GHPATH}/img/machine/david-compact.jpg`,
    `${GHPATH}/img/machine/elettra-crono-24.jpg`,
    `${GHPATH}/img/machine/elettra-crono-32.jpg`,
    `${GHPATH}/img/machine/elletra-crono-24.jpg`,
    `${GHPATH}/img/machine/jolly-zeus-18-fruit.jpg`,
    `${GHPATH}/img/machine/jolly-zeus-18.jpg`,
    `${GHPATH}/img/machine/jolly-zeus-24.jpg`,
    `${GHPATH}/img/machine/jolly-zeus-28.jpg`,
    `${GHPATH}/img/machine/jolly-zeus-32.jpg`,
];

var CACHE_NAME = APP_PREFIX + VERSION
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (request) {
      if (request) {
        //console.log('Responding with cache : ' + event.request.url);
        return request
      } else {
        //console.log('File is not cached, fetching : ' + event.request.url);
        return fetch(event.request)
      }
    })
  )
})

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('Installing cache : ' + CACHE_NAME);
      return cache.addAll(URLS)
    })
  )
})

self.addEventListener('activate', function (e) {
  e.waitUntil(

    caches.keys().then(function (keyList) {
      var cacheWhitelist = keyList.filter(function (key) {
        return key.indexOf(APP_PREFIX)
      })
      cacheWhitelist.push(CACHE_NAME);
      return Promise.all(keyList.map(function (key, i) {
        if (cacheWhitelist.indexOf(key) === -1) {
          console.log('Deleting cache : ' + keyList[i] );
          return caches.delete(keyList[i])
        }
      }))
    })
  )
})
