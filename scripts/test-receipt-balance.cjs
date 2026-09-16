const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const m={exports:{}}
new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/receipt-balance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports)
const {receiptBalance:b}=m.exports
assert.deepEqual(b({amount:80,status:'paid'}),{paid:80,remaining:0,partial:false,hasAllocations:false})
assert.equal(b({amount:80,status:'cancelled'}).remaining,0)
const a={amount:40,paid_date:'2026-09-16',method:'cash',voided_at:null}
assert.deepEqual(b({amount:80,status:'pending',manual_receipt_allocations:[a]}),{paid:40,remaining:40,partial:true,hasAllocations:true})
assert.deepEqual(b({amount:80,status:'paid',manual_receipt_allocations:[a,a]}),{paid:80,remaining:0,partial:false,hasAllocations:true})
assert.equal(b({amount:80,status:'pending',manual_receipt_allocations:[a,{...a,voided_at:'2026-09-16'}]}).paid,40)
assert.equal(b({amount:0.3,status:'paid',manual_receipt_allocations:[{...a,amount:0.1},{...a,amount:0.2}]}).remaining,0)
console.log('PASS: legacy balances, partial/final payments, voided allocations and cent rounding')
