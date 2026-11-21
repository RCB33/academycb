const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
let calls = [], emailCount = 0, rpcError = null, authorized = true, refreshContext = null
const request = { service: 'academy', email: 'fixture@example.invalid', academy_details: { payment_choice: 'monthly_card' } }
const db = { from() { const q = { select() { return q }, update() { return q }, eq() { return q }, single() { return Promise.resolve({ data: request }) }, then(resolve) { return Promise.resolve({}).then(resolve) } }; return q }, async rpc(name, args) { calls.push({ name, args }); return { data: name === 'academy_request_review_context' ? refreshContext : 'child-fixture', error: rpcError } } }
function load(file) {
 const m = { exports: {} }
 new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m, m.exports, name => {
  if (name === '@/lib/offering') return load('src/lib/offering.ts')
  if (name === '@/lib/academy-request-review') return load('src/lib/academy-request-review.ts')
  if (name === '@/lib/auth') return { requireAdmin: async () => { if (!authorized) throw Error('No autorizado'); return { supabase: db, user: { id: 'admin-fixture' } } } }
  if (name === 'next/cache') return { revalidatePath() {} }
  if (name === '@/lib/enrollment') return {}
  if (name === '@/lib/supabase/admin') return { createAdminClient: () => db }
  if (name === '@/lib/registration-email') return { deliverRegistrationEmails: async () => { emailCount++ } }
  if (name === '@/lib/enrollment-onboarding') return { onboardAcceptedFamily: async () => ({ status: 'existing', guardianId: 'guardian-fixture' }), prepareAcceptedSubscription: async () => ({ status: 'ready', requestId: 'billing-fixture' }) }
  return require(name)
 })
 return m.exports
}
;(async () => {
 const { reviewedAcademyQuote, academyRequestReviewSchema, retainedAcademyReviewInput } = load('src/lib/academy-request-review.ts')
 const context = { fee_exempt: false, plus_recorded: false, request: { academy_details: { plan: { price: 75, enrollment_fee: 30, season_start: '2026-09-15', season_end: '2027-05-31' }, quote: { plus: 0 } } } }
 for (const [day, pct] of [[1, 100], [7, 100], [8, 75], [15, 75], [16, 50], [22, 50], [23, 25], [30, 25]]) {
  for (const fee of [false, true]) {
   const q = reviewedAcademyQuote(context, `2026-11-${String(day).padStart(2, '0')}`, fee)
   assert.equal(q.percent, pct); assert.equal(q.first_total, 75 * pct / 100 + (fee ? 30 : 0))
  }
 }
 const q = reviewedAcademyQuote(context, '2026-12-01', false)
 assert.equal(q.first_total, 75); assert.equal(q.remaining[0].due_date, '2027-01-01'); assert.equal(q.remaining.length, 5)
 context.request.academy_details.quote.plus = 50
 assert.equal(reviewedAcademyQuote(context, '2027-02-01', true).first_total, 155)
 assert.equal(reviewedAcademyQuote(context, '2027-02-01', false).first_total, 125)
 assert.equal(reviewedAcademyQuote(context, '2027-02-23', true).first_total, 98.75, 'Plus and matrícula are never prorated')
 assert.equal(reviewedAcademyQuote(context, '2027-02-01', true).remaining[0].amount, 75, 'Plus is not charged again each month')
 context.fee_exempt = true; context.plus_recorded = true; context.request.academy_details.quote.plus = 50
 assert.equal(reviewedAcademyQuote(context, '2027-05-23', true).first_total, 18.75)
 assert.throws(() => reviewedAcademyQuote(context, '2027-06-01', false))
 assert.equal(academyRequestReviewSchema.safeParse({ startDate: '2027-02-31', chargeEnrollment: false, revision: 'a'.repeat(32) }).success, false)
 const { convertEnrollmentRequest: accept } = load('src/app/actions/enrollment.ts')
 const id = '00000000-0000-4000-8000-000000000001', review = { startDate: '2026-12-01', chargeEnrollment: false, revision: 'a'.repeat(32) }
 assert.equal((await accept(id)).success, false); assert.equal(calls.length, 0); assert.equal(emailCount, 0)
 rpcError = { message: 'La solicitud o la ficha ha cambiado. Recarga la revisión antes de aceptar' }
 const stale = await accept(id, review)
 assert.equal(stale.success, false); assert.equal(stale.reviewStale, true); assert.equal(emailCount, 0)
 const { refreshAcademyRequestReview: refresh } = load('src/app/actions/academy-request-review.ts')
 rpcError = null
 refreshContext = { ...context, request: { ...context.request, status: 'new', academy_details: { ...context.request.academy_details, start_date: '2026-11-22' } }, revision: 'b'.repeat(32) }
 const refreshed = await refresh(id)
 assert.equal(refreshed.success, true); assert.equal(refreshed.context.revision, 'b'.repeat(32)); assert.equal(emailCount, 0)
 assert.deepEqual(retainedAcademyReviewInput(refreshed.context, '2027-02-01', false), { startDate: '2027-02-01', chargeEnrollment: false })
 assert.equal(retainedAcademyReviewInput(refreshed.context, '2027-02-01', true).chargeEnrollment, false, 'Fresh exemption overrides old fee choice')
 assert.equal(retainedAcademyReviewInput(refreshed.context, '2028-02-01', false).startDate, '2026-11-22', 'New season bounds override incompatible date')
 refreshContext.request.status = 'converted'
 assert.equal((await refresh(id)).closed, true); assert.equal(emailCount, 0)
 rpcError = { message: 'No se pudo cargar la ficha' }
 assert.equal((await refresh(id)).success, false); assert.equal(emailCount, 0)
 rpcError = null
 rpcError = null
 assert.equal((await accept(id, review)).success, true); assert.equal(emailCount, 1)
 assert.equal(calls.at(-1).name, 'accept_reviewed_academy_request')
 assert.deepEqual(calls.at(-1).args, { request_uuid: id, start_date_input: review.startDate, charge_enrollment_input: false, revision_input: review.revision })
 authorized = false; await assert.rejects(() => accept(id, review), /No autorizado/); await assert.rejects(() => refresh(id), /No autorizado/); assert.equal(emailCount, 1)
 console.log('PASS: review preview, proration boundaries, month move, fee/Plus exemptions, server requires review/admin, stale review refresh retains edits and exemptions, closed and unauthorized reviews blocked; refresh and failed approval send no mail. Mocks only.')
})().catch(e => { console.error(e); process.exitCode = 1 })
