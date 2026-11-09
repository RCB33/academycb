const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
let authorized=true,updates=[],payments=[{amount:89,status:'pending',manual_receipt_allocations:[]}]
function from(table){const q={then(resolve,reject){return Promise.resolve({data:table==='payments'?payments:[],error:null}).then(resolve,reject)}};for(const method of ['select','eq','update'])q[method]=(...args)=>{if(method==='update')updates.push(args[0]);return q};return q}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,name=>{if(name==='next/cache')return {revalidatePath(){}};if(name==='@/lib/auth')return {requireAdmin:async()=>{if(!authorized)throw Error('Forbidden');return {supabase:{from}}}};if(name==='@/lib/receipt-balance')return load('src/lib/receipt-balance.ts');return require(name)});return m.exports}
;(async()=>{
 const {updateEnrollment,removeEnrollment}=load('src/app/actions/campus.ts'),id='11111111-1111-4111-8111-111111111111'
 assert.equal((await updateEnrollment(id,{status:'confirmed'})).success,false)
 assert.equal(updates.length,0)
 payments[0].manual_receipt_allocations=[{amount:30,voided_at:null}]
 assert.equal((await removeEnrollment(id)).success,false)
 assert.equal((await updateEnrollment(id,{notes:'Updated',tshirt_size:'10 años'})).success,true)
 assert.equal(updates[0].notes,'Updated')
 assert.equal((await updateEnrollment(id,{child_id:'tampered'})).success,false)
 payments=[{amount:89,status:'paid',manual_receipt_allocations:[]}]
 assert.equal((await updateEnrollment(id,{status:'confirmed'})).success,true)
 assert.equal((await removeEnrollment(id)).success,false)
 payments=[{amount:89,status:'pending',manual_receipt_allocations:[]}]
 assert.equal((await removeEnrollment(id)).success,true)
 assert.equal(updates.at(-1).status,'cancelled')
 authorized=false;await assert.rejects(()=>updateEnrollment(id,{notes:'Denied'}),/Forbidden/)
 console.log('PASS: campus admin-only edits, field whitelist, unpaid confirmation denied, partial/paid cancellation denied, soft cancellation. No data writes.')
})().catch(e=>{console.error(e);process.exitCode=1})
