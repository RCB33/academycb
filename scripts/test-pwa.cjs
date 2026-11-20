const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm')
const handlers = {}, cached = new Map(), deleted = []
let fetchFails = false, skipped = 0, claimed = 0, fetched = []
const context = {
  URL, Request, Response,
  self: { location: { origin: 'https://www.academycostabrava.com' }, addEventListener: (name, fn) => handlers[name] = fn, skipWaiting: () => skipped++, clients: { claim: async () => claimed++ } },
  caches: {
    open: async () => ({ add: async req => { assert.equal(req.credentials, 'omit'); cached.set(new URL(req.url).pathname, new Response('Offline only')) } }),
    keys: async () => ['academy-offline-v0', 'academy-offline-v1', 'unrelated-cache'],
    delete: async key => deleted.push(key),
    match: async path => cached.get(path)?.clone(),
  },
  fetch: async req => { fetched.push(req.url); if (fetchFails) throw Error('Offline'); return new Response('Live, private content') },
}
context.Request = class extends Request { constructor(url, options) { super(new URL(url, context.self.location.origin), options) } }
vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), context)
async function lifecycle(name) { let pending; handlers[name]({ waitUntil(p) { pending = p } }); await pending }
async function navigate(path, method = 'GET', mode = 'navigate') {
  let pending
  handlers.fetch({ request: { url: new URL(path, context.self.location.origin).href, method, mode }, respondWith(p) { pending = p } })
  return pending ? (await pending).text() : null
}
;(async () => {
  await lifecycle('install')
  assert.deepEqual([...cached.keys()], ['/offline.html'])
  assert.equal(skipped, 0, 'Do not force an update over an active form')
  await lifecycle('activate')
  assert.deepEqual(deleted, ['academy-offline-v0']); assert.equal(claimed, 1)
  assert.equal(await navigate('/portal/dashboard'), 'Live, private content')
  assert.deepEqual([...cached.keys()], ['/offline.html'], 'Private responses never enter cache')
  fetchFails = true
  for (const path of ['/portal', '/portal/codigo?type=recovery', '/portal/pagos/solicitud/test', '/pago/resultado?session_id=secret', '/admin']) assert.equal(await navigate(path), 'Offline only')
  assert.equal(await navigate('/api/billing/test/checkout', 'POST'), null, 'Never intercept or retry a payment/form submission')
  assert.equal(await navigate('/portal?_rsc=1', 'GET', 'cors'), null, 'Never cache or substitute React server data')
  assert.equal(await navigate('https://checkout.stripe.com/test'), null, 'Do not intercept payment provider')
  handlers.message({ data: { type: 'unrelated' } }); assert.equal(skipped, 0)
  handlers.message({ data: { type: 'ACTIVATE_UPDATE' } }); assert.equal(skipped, 1)
  cached.clear(); assert.match(await navigate('/portal'), /Sin conexión/)
  console.log('PASS: offline fallback, live-only family data, untouched POST/payment/provider requests, scoped cache cleanup and explicit updates. Isolated worker simulation.')
})().catch(error => { console.error(error); process.exitCode = 1 })
