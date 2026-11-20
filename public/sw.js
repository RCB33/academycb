// Only the generic offline page is cached. Never store sessions, family data,
// API responses, payment links or form submissions in a service-worker cache.
const CACHE = 'academy-offline-v1'
const OFFLINE = '/offline.html'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(OFFLINE, { cache: 'reload', credentials: 'omit' }))))
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith('academy-offline-') && key !== CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

// A new worker waits until the user chooses to update, or closes all app tabs.
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(fetch(event.request).catch(async () => {
    const page = await caches.match(OFFLINE, { cacheName: CACHE })
    return page || new Response('Sin conexión. Vuelve a intentarlo cuando tengas internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }))
})
