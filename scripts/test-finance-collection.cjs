const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
let authorized = true, calls = [], result = { data: [{ id: 'receipt' }], error: null }
function from(table) {
    const query = { then(resolve, reject) { return Promise.resolve(table === 'academy_settings' ? { data: { value: 'true' }, error: null } : result).then(resolve, reject) } }
    for (const method of ['select', 'eq', 'in', 'is', 'order', 'maybeSingle', 'single', 'update', 'insert']) query[method] = (...args) => { calls.push({ table, method, args }); return query }
    return query
}
const moduleResult = { exports: {} }
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('src/app/actions/finance.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(moduleResult, moduleResult.exports, name => {
    if (name === 'next/cache') return { revalidatePath() {} }
    if (name === '@/lib/auth') return { requireFinanceAccess: async () => { if (!authorized) throw Error('Forbidden'); return { supabase: { from, rpc: async (name, args) => { calls.push({method:'rpc',name,args}); return result } } } }, requireAdmin: async () => { throw Error('Not used') } }
    if (name === '@/lib/receipt-balance') { const m={exports:{}}; new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/receipt-balance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports); return m.exports }
    return require(name)
})
const { collectExistingReceipt, collectManualBatch, recordManualPayment, setPaymentStatus } = moduleResult.exports
const input = { id: '11111111-1111-4111-8111-111111111111', version: '2026-09-16T08:00:00+00:00', date: '2026-09-14', method: 'transfer' }
;(async () => {
    const batch={requestId:input.id,lines:[{id:input.id,version:input.version,amount:40}],total:40,date:input.date,method:input.method,note:''}
    assert.equal((await collectManualBatch(batch)).success,true)
    assert.equal(calls[0].name,'collect_manual_batch')
    assert.equal(calls[0].args.batch_input,input.id)
    assert.deepEqual(calls[0].args.lines_input,batch.lines)
    assert.equal(calls.some(c=>c.method==='insert'||c.method==='update'),false)
    calls=[]
    assert.equal((await collectManualBatch({...batch,total:80})).success,false)
    assert.equal((await collectManualBatch({...batch,total:40.001})).success,false)
    assert.equal((await collectManualBatch({...batch,method:'stripe'})).success,false)
    assert.equal(calls.length,0)
    result = { data: null, error: { message: 'Checkout in progress' } }
    assert.equal((await collectManualBatch(batch)).success, false)
    calls = []
    assert.equal((await collectExistingReceipt({ ...input, method: 'stripe' })).success, false)
    assert.equal(calls.length, 0)
    assert.equal((await setPaymentStatus(input.id, 'paid')).success, false, 'old one-click paid path disabled')
    assert.equal((await recordManualPayment({ amount: 50, type: 'academy', method: 'cash', description: 'Extra', date: input.date })).success, false)
    assert.equal(calls.some(c => c.method === 'insert'), false)
    authorized = false
    await assert.rejects(() => collectExistingReceipt(input), /Forbidden/)
    console.log('PASS: atomic batch RPC, exact split total, cent validation, stable request id, disabled old paid path, permissions and independent income confirmation. No network or data writes.')
})().catch(error => { console.error(error); process.exitCode = 1 })
