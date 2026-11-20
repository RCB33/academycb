const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
let rows = {}
const db = { from(table) { const q = { select() { return q }, eq() { return q }, single() { return Promise.resolve({ data: rows[table], error: null }) }, maybeSingle() { return q.single() }, then(resolve, reject) { return q.single().then(resolve, reject) } }; return q } }
function load(file) {
  const m = { exports: {} }
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => {
    if (name === 'server-only') return {}
    if (name === '@/lib/supabase/admin') return { createAdminClient: () => db }
    if (name === '@/lib/receipt-balance') return load('src/lib/receipt-balance.ts')
    return require(name)
  })
  return m.exports
}
;(async () => {
  const { registrationEmailDetails: details, familyAccessMessage } = load('src/lib/registration-email-details.ts')
  const a = { plan: { name: 'Una sesión' }, groups: [{ name: 'Benjamines', schedule: '17:30–19:00', public_offer: { day: 'Martes', location: 'Campo' } }], start_date: '2027-01-16', quote: { percent: 50, monthly_price: 75, season_end: '2027-05-31', remaining: [1, 2, 3, 4] }, accepted: { membership_id: 'membership', first_month: 37.5, enrollment_fee: 30, plus: 0 }, payment_choice: 'monthly_card' }
  rows = { enrollment_requests: { service: 'academy', child_name: 'Jugador de prueba', status: 'enrolled', academy_details: a }, event_campaign_settings: { iban: 'MOCK-ONLY', bank_holder: 'Academy' }, payments: [
    { amount: 37.5, status: 'pending', concept_code: 'monthly', covered_month: '2027-01', manual_receipt_allocations: [{ amount: 10, voided_at: null }] },
    { amount: 30, status: 'overdue', concept_code: 'enrollment' },
    { amount: 75, status: 'pending', concept_code: 'monthly', covered_month: '2027-02' },
    { amount: 50, status: 'cancelled', concept_code: 'plus' },
  ] }
  let result = await details('enrollment', 'test-request', 'received')
  assert.match(result.message, /Todavía no realices ningún pago/)
  assert.doesNotMatch(result.message, /MOCK-ONLY/)
  result = await details('enrollment', 'test-request', 'reviewed')
  assert.match(result.message, /Importe inicial pendiente: 57\.50 €/)
  assert.match(result.message, /Primera cuota: 37\.50 € \(50 %\)/)
  assert.match(result.message, /Todavía no hay ningún cobro automático activado/)
  assert.doesNotMatch(result.message, /solicitud\/test-request/)
  a.onboarding = { billing: 'ready', billing_request_id: 'billing-test' }
  result=await details('enrollment', 'test-request', 'reviewed');assert.match(result.message,/solicitud\/billing-test/);assert.equal(result.action.label,'Activar pago mensual con tarjeta');assert.match(result.action.href,/solicitud\/billing-test$/);assert.doesNotMatch(result.message,/IBAN|transferencia/i)
  rows.payments.forEach(p => p.status = 'paid')
  assert.match((await details('enrollment', 'test-request', 'reviewed')).message, /primer pago no tiene importes pendientes/)
  rows.enrollment_requests.status = 'rejected'
  assert.equal(await details('enrollment', 'test-request', 'reviewed'), null)
  rows.enrollment_requests = { service: 'campus', child_name: 'Jugador de prueba', status: 'enrolled', activity_name: 'Campus Navidad' }
  rows.campus_request_links = { enrollment_id: 'campus-test' }
  rows.payments = [{ amount: 197, status: 'pending', manual_receipt_allocations: [{ amount: 100, voided_at: null }] }]
  assert.match((await details('enrollment', 'test-request', 'reviewed')).message, /Importe pendiente: 97\.00 €/)
  assert.match(familyAccessMessage('invited'), /correo separado/)
  assert.match(familyAccessMessage('existing'), /contraseña habituales/)
  assert.doesNotMatch(familyAccessMessage(), /hemos enviado/)
  rows.academy_memberships={child_id:'qa',start_date:'2027-01-23',end_date:'2027-05-31',status:'active',plan_snapshot:{manual_v2:true,name:'Dos sesiones',first_percent:25,frequency:'mensual',groups:[{name:'Domingo',schedule:'15:00–16:30',public_offer:{day:'Domingo'}}],onboarding:{access:'invited'}}}
  rows.children={full_name:'Jugador QA'}
  rows.payments=[{amount:35,status:'pending',concept_code:'monthly',covered_month:'2027-01'},{amount:30,status:'pending',concept_code:'registration'},{amount:140,status:'pending',concept_code:'monthly',covered_month:'2027-02'}]
  result=await details('membership','qa','reviewed')
  assert.match(result.message,/Importe inicial pendiente: 65\.00 €/)
  assert.match(result.message,/25 %/)
  assert.match(result.message,/Domingo/)
  assert.match(result.message,/correo separado/)
  assert.match(result.message,/efectivo/);assert.doesNotMatch(result.message,/IBAN|transferencia/i)
  rows.event_registrations = { status: 'paid' }
  assert.equal(await details('event', 'test-request', 'awaiting_payment'), null)
  console.log('PASS: personalized acceptance, partial/overdue balances, future installments excluded, card activation honest, stale notices guarded. No emails or network.')
})().catch(e => { console.error(e); process.exitCode = 1 })
