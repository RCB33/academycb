const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
let rows = {}
const db = { from(table) { const q = { select() { return q }, eq() { return q }, single() { return Promise.resolve({ data: rows[table], error: null }) }, maybeSingle() { return q.single() }, then(resolve, reject) { return q.single().then(resolve, reject) } }; return q } }
function load(file) {
  const m = { exports: {} }
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports, name => {
    if (name === '@/lib/enrollment-payment') return load('src/lib/enrollment-payment.ts')
    if (name === 'server-only') return {}
    if (name === '@/lib/supabase/admin') return { createAdminClient: () => db }
    if (name === '@/lib/receipt-balance') return load('src/lib/receipt-balance.ts')
    if (name === '@/lib/academy-cash-instructions') return load('src/lib/academy-cash-instructions.ts')
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
  assert.equal(result.welcome, undefined, 'Received requests are not welcomed as accepted')
  assert.doesNotMatch(result.message, /MOCK-ONLY/)
  result = await details('enrollment', 'test-request', 'reviewed')
  assert.equal(result.welcome, true)
  assert.match(result.message, /Importe inicial pendiente: 57\.50 €/)
  assert.match(result.message, /Primera cuota: 37\.50 € \(50 %\)/)
  assert.match(result.message, /Todavía no hay ningún cobro automático activado/)
  assert.doesNotMatch(result.message, /solicitud\/test-request/)
  a.onboarding = { billing: 'ready', billing_request_id: 'billing-test' }
  result=await details('enrollment', 'test-request', 'reviewed');assert.match(result.message,/solicitud\/billing-test/);assert.equal(result.action.label,'Activar pago mensual con tarjeta');assert.match(result.action.href,/solicitud\/billing-test$/);assert.doesNotMatch(result.message,/IBAN|transferencia/i)
  a.onboarding.billing_initial=true
  result=await details('enrollment','test-request','reviewed');assert.equal(result.action.label,'Pagar alta y activar mensualidades');assert.match(result.message,/Primer pago con tarjeta: 57\.50/);assert.match(result.message,/una sola vez/);assert.doesNotMatch(result.message,/efectivo por separado/)
  assert.match(result.message,/se cobra al completar Stripe/)
  const original = { start_date:a.start_date, quote:a.quote, accepted:a.accepted, payments:rows.payments }
  a.start_date='2026-12-01';a.quote={...a.quote,percent:100,remaining:[{due_date:'2027-01-01'}]};a.accepted={...a.accepted,first_month:75,enrollment_fee:0}
  rows.payments=[{amount:75,status:'pending',concept_code:'monthly',covered_month:'2026-12'},{amount:75,status:'pending',concept_code:'monthly',covered_month:'2027-01'}]
  result=await details('enrollment','test-request','reviewed')
  assert.match(result.message,/Incorporación: 2026-12-01/);assert.match(result.message,/Primera cuota: 75.00 € \(100 %\)/);assert.match(result.message,/Matrícula: 0.00 € \(exenta\)/)
  assert.match(result.message,/Primer pago con tarjeta: 75.00/);assert.match(result.message,/no se cobrará de nuevo al empezar/);assert.match(result.message,/siguiente cobro mensual será el 2027-01-01/)
  a.start_date=original.start_date;a.quote=original.quote;a.accepted=original.accepted;rows.payments=original.payments
  // Cash: include only the chosen annual Plus, preserve partial payments and
  // never send card activation or transfer instructions to a cash family.
  a.payment_choice='cash';a.start_date='2027-02-01';a.accepted={...a.accepted,first_month:75,enrollment_fee:30,plus:0}
  rows.payments=[{amount:75,status:'pending',concept_code:'monthly',covered_month:'2027-02'},{amount:30,status:'pending',concept_code:'registration'},{amount:75,status:'pending',concept_code:'monthly',covered_month:'2027-03'}]
  result=await details('enrollment','test-request','reviewed')
  assert.match(result.message,/Trae 105,00\s€ el primer día de entrenamiento/);assert.match(result.message,/1 de febrero de 2027/);assert.match(result.message,/equipo confirme la entrega/);assert.equal(result.action,undefined)
  assert.doesNotMatch(result.message,/IBAN|transferencia|Activa tu suscripción|paga de forma segura en Stripe/)
  a.quote={...a.quote,percent:100,remaining:[{due_date:'2027-03-01'}]}
  a.accepted.enrollment_fee=0;rows.payments=rows.payments.filter(p=>p.concept_code!=='registration')
  result=await details('enrollment','test-request','reviewed')
  assert.match(result.message,/Incorporación: 2027-02-01/);assert.match(result.message,/Primera cuota: 75.00 € \(100 %\)/)
  assert.match(result.message,/Matrícula: 0.00 € \(exenta\)/);assert.match(result.message,/Trae 75,00\s€ el primer día de entrenamiento/)
  assert.doesNotMatch(result.message,/IBAN|transferencia|paga de forma segura en Stripe/)
  a.accepted.enrollment_fee=30;rows.payments.splice(1,0,{amount:30,status:'pending',concept_code:'registration'})
  a.accepted.plus=50;rows.payments.push({amount:50,status:'pending',concept_code:'plus'})
  result=await details('enrollment','test-request','reviewed');assert.match(result.message,/Trae 155,00\s€/);assert.match(result.message,/Plus anual: 50.00/)
  rows.payments[0].manual_receipt_allocations=[{amount:20,voided_at:null}]
  result=await details('enrollment','test-request','reviewed');assert.match(result.message,/Trae 135,00\s€/)
  rows.payments.forEach(p=>p.status='paid')
  result=await details('enrollment','test-request','reviewed');assert.doesNotMatch(result.message,/Trae/)
  a.payment_choice='monthly_card';a.start_date=original.start_date;a.quote=original.quote;a.accepted=original.accepted;rows.payments=original.payments
  const remaining=a.quote.remaining;a.quote.remaining=[]
  result=await details('enrollment','test-request','reviewed');assert.equal(result.action.label,'Pagar el importe inicial');assert.match(result.message,/no hay cargos mensuales posteriores/);a.quote.remaining=remaining
  rows.payments.forEach(p => p.status = 'paid')
  assert.match((await details('enrollment', 'test-request', 'reviewed')).message, /primer pago no tiene importes pendientes/)
  rows.enrollment_requests.status = 'rejected'
  assert.equal(await details('enrollment', 'test-request', 'reviewed'), null)
  rows.enrollment_requests = { service: 'campus', child_name: 'Jugador de prueba', status: 'enrolled', activity_name: 'Campus Navidad' }
  rows.campus_request_links = { enrollment_id: 'campus-test' }
  rows.payments = [{ amount: 197, status: 'pending', manual_receipt_allocations: [{ amount: 100, voided_at: null }] }]
  assert.match((await details('enrollment', 'test-request', 'reviewed')).message, /Importe pendiente: 97\.00 €/)
  rows.enrollment_requests.campus_details = { payment_choice:'cash' }
  result = await details('enrollment','test-request','reviewed')
  assert.match(result.message,/Campus: efectivo/)
  assert.match(result.message,/97\.00 €/)
  assert.doesNotMatch(result.message,/IBAN|transferencia|MOCK-ONLY/i,'Cash Campus confirmations never give bank transfer instructions')
  rows.enrollment_requests = { service:'academy',child_name:'QA',activity_name:'Academia + Campus + Torneos',status:'new',academy_details:{...a,requested_payments:{academy:'monthly_card',campus:'cash',tournament:'transfer'}} }
  result = await details('enrollment','test-request','received')
  assert.match(result.message,/Academia: Tarjeta con Stripe/)
  assert.match(result.message,/Campus: Efectivo/)
  assert.match(result.message,/Torneos: Transferencia bancaria/)
  assert.match(result.message,/plaza se confirmará por separado/)
  assert.doesNotMatch(result.message,/IBAN|MOCK-ONLY/)
  assert.match(familyAccessMessage('invited'), /correo separado/)
  assert.match(familyAccessMessage('existing'), /contraseña habituales/)
  assert.doesNotMatch(familyAccessMessage(), /hemos enviado/)
  rows.academy_memberships={child_id:'qa',start_date:'2027-01-23',end_date:'2027-05-31',status:'active',plan_snapshot:{manual_v2:true,name:'Dos sesiones',first_percent:25,frequency:'mensual',groups:[{name:'Domingo',schedule:'15:00–16:30',public_offer:{day:'Domingo'}}],onboarding:{access:'invited'}}}
  rows.children={full_name:'Jugador QA'}
  rows.payments=[{amount:35,status:'pending',concept_code:'monthly',covered_month:'2027-01'},{amount:30,status:'pending',concept_code:'registration'},{amount:140,status:'pending',concept_code:'monthly',covered_month:'2027-02'}]
  result=await details('membership','qa','reviewed')
  assert.equal(result.welcome,true)
  assert.match(result.message,/Importe inicial pendiente: 65\.00 €/)
  assert.match(result.message,/25 %/)
  assert.match(result.message,/Domingo/)
  assert.match(result.message,/correo separado/)
  assert.match(result.message,/efectivo/);assert.doesNotMatch(result.message,/IBAN|transferencia/i)
  rows.event_registrations = { status: 'paid' }
  assert.equal(await details('event', 'test-request', 'awaiting_payment'), null)
  console.log('PASS: personalized acceptance, partial/overdue balances, future installments excluded, card activation honest, stale notices guarded. No emails or network.')
})().catch(e => { console.error(e); process.exitCode = 1 })
