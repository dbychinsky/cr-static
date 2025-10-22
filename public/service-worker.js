const CACHE_NAME = 'pwa-cache-v4'
const urlsToCache = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching app shell...')
            return cache.addAll(urlsToCache)
        })
    )
})

self.addEventListener('activate', event => {
    console.log('Service Worker activated')
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
        )
    )
})

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return (
                response ||
                fetch(event.request).catch(() =>
                    caches.match('/index.html')
                )
            )
        })
    )
})
