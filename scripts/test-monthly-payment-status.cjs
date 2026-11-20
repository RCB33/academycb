const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>load(path.resolve(path.dirname(file),n+'.ts')));return m.exports}
const {monthlyPaymentStatus:s,agreedAcademyMethod}=load('src/lib/monthly-payment-status.ts');
const p={amount:75,type:'academy',concept_code:'monthly',covered_month:'2027-01',status:'pending'};
assert.equal(s([],'2027-01'),'missing');assert.equal(s([p],'2027-01'),'pending');assert.equal(s([{...p,status:'paid'}],'2027-01'),'paid');assert.equal(s([{...p,status:'paid'}],'2027-02'),'missing');
assert.equal(s([{...p,amount:0,status:'paid'}],'2027-01'),'waived');
for(const status of ['cancelled','refunded'])assert.equal(s([{...p,status}],'2027-01'),'missing');
for(const change of [{type:'campus'},{concept_code:'registration'},{covered_month:null}])assert.equal(s([{...p,...change,status:'paid'}],'2027-01'),'missing');
const allocation={amount:25,paid_date:'2027-01-01',method:'cash',voided_at:null};
assert.equal(s([{...p,manual_receipt_allocations:[allocation]}],'2027-01'),'partial');
assert.equal(s([{...p,manual_receipt_allocations:[{...allocation,amount:75}]}],'2027-01'),'paid');
assert.equal(s([{...p,status:'paid',manual_receipt_allocations:[{...allocation,voided_at:'2027-01-02'}]}],'2027-01'),'pending');
assert.equal(s([{...p,status:'paid'},p],'2027-01'),'partial');
assert.equal(agreedAcademyMethod('cash'),'Efectivo');assert.match(agreedAcademyMethod(null,'transferencia'),/revisar/);
console.log('PASS paid/pending/partial/waived/no receipt, voided payments, mixed receipts, unrelated activities and historical months. No financial writes.');
