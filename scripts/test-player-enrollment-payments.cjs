const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const child='11111111-1111-4111-8111-111111111111'
const academy={id:'academy',service:'academy',activity_name:'Academia + Campus + Torneos',status:'enrolled',created_at:'2026-11-20',academy_choice:'monthly_card',requested_payments:{academy:'monthly_card',campus:'cash',tournament:'transfer'}}
const campus={id:'campus',service:'campus',activity_name:'Campus Navidad',status:'enrolled',created_at:'2026-11-19',campus_choice:'cash'}
let authorized=true,fail=false,calls=[]
const db={from(table){calls.push(table);const q={select(columns){assert.doesNotMatch(columns,/medical|health/);return q},or(filter){assert.equal(filter,`linked_child_id.eq.${child},accepted_child_id.eq.${child}`);return q},neq(key,value){assert.equal(key,'status');assert.equal(value,'lost');return q},order(){return q},eq(key,value){assert.equal(key,'enrollment.child_id');assert.equal(value,child);return q},then(resolve,reject){return Promise.resolve({error:fail?{message:'fixture'}:null,data:table==='enrollment_requests'?[academy,campus,{...academy,id:'legacy',academy_choice:'transfer',requested_payments:null}]:[{enrollment_id:'campus-enrollment',request:campus}]}).then(resolve,reject)}};return q}}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,name=>{if(name==='@/lib/auth')return {requireAdmin:async()=>{if(!authorized)throw Error('Not authorized');return {supabase:db}}};if(name==='@/lib/enrollment-payment')return load('src/lib/enrollment-payment.ts');return require(name)});return m.exports}
global.fetch=()=>{throw Error('Network forbidden')}
;(async()=>{
 const {getPlayerEnrollmentPayments:get}=load('src/app/actions/player-enrollment-payments.ts')
 let rows=await get(child)
 assert.equal(rows.length,3,'Accepted Campus request is deduplicated across both links')
 assert.deepEqual(rows[0].choices,{academy:'monthly_card',campus:'cash',tournament:'transfer'})
 assert.equal(rows.find(r=>r.id==='campus').campusEnrollmentId,'campus-enrollment')
 assert.equal(rows.find(r=>r.id==='campus').choices.campus,'cash')
 assert.deepEqual(rows.find(r=>r.id==='legacy').choices,{},'Legacy invalid academy preferences are not shown as permitted')
 calls=[];authorized=false;await assert.rejects(get(child),/Not authorized/);assert.equal(calls.length,0)
 authorized=true;await assert.rejects(get('not-a-uuid'),/Jugador no válido/);assert.equal(calls.length,0)
 fail=true;await assert.rejects(get(child),/No se pudieron consultar/)
 console.log('PASS: linked and accepted player payment preferences, Campus enrollment mapping, deduplication, historical unknown values, admin authorization and query errors. Mock-only; no database writes.')
})().catch(e=>{console.error(e);process.exitCode=1})
