const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const plan={id:id(1),name:'Una sesión',price:75,enrollment_fee:30,sessions_per_week:1,season_start:'2026-09-15',season_end:'2027-05-31',is_active:true}
const group={id:id(2),name:'Infantil',schedule:'17:30–19:00',status:'active',public_offer:{kind:'field',day:'Martes',published:true,birth_from:2010,birth_to:2012}}
const sunday={...group,id:id(3),public_offer:{...group.public_offer,kind:'sunday',day:'Domingo'}}
let offer={version:'catalogue-v1',plans:[plan],groups:[group,sunday]},calls=[],authorized=true
const context={revision:'a'.repeat(32),request:{birth_date:'2011-12-10'}}
const db={async rpc(name,args){calls.push({name,args});return {data:name==='academy_request_completion_context'?context:null,error:null}}}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports,n=>{
 if(n==='@/lib/offering')return load('src/lib/offering.ts')
 if(n==='@/lib/academy-request-completion')return load('src/lib/academy-request-completion.ts')
 if(n==='@/lib/offering-server')return {getAcademyOffer:async()=>offer}
 if(n==='@/lib/auth')return {requireAdmin:async()=>{if(!authorized)throw Error('No autorizado');return {supabase:db}}}
 if(n==='next/cache')return {revalidatePath(){}}
 return require(n)
});return m.exports}
;(async()=>{
 const {completeAcademyDetails:complete,academyCompletionSchema:schema}=load('src/lib/academy-request-completion.ts')
 const input={planId:plan.id,groupId:group.id,secondGroupId:'',startDate:'2026-12-01',chargeEnrollment:false,plus:true,paymentChoice:'cash',offerVersion:offer.version,revision:context.revision}
 const d=complete(offer,input,'2011-12-10');assert.equal(d.quote.first_total,125);assert.equal(d.quote.remaining[0].due_date,'2027-01-01');assert.equal(d.payment_choice,'cash')
 assert.equal(complete(offer,{...input,startDate:'2026-11-22',chargeEnrollment:true},'2011-12-10').quote.first_total,117.5)
 assert.equal(schema.safeParse({...input,paymentChoice:'transfer'}).success,false)
 assert.throws(()=>complete(offer,{...input,offerVersion:'old'},'2011-12-10'),/han cambiado/)
 assert.throws(()=>complete(offer,input,'2020-01-01'),/nacimiento/)
 assert.throws(()=>complete(offer,{...input,secondGroupId:sunday.id},'2011-12-10'),/solo grupo/)
 assert.throws(()=>complete(offer,{...input,startDate:'2027-06-01'},'2011-12-10'))
 offer.plans[0]={...plan,sessions_per_week:2}
 assert.throws(()=>complete(offer,input,'2011-12-10'),/domingo/)
 assert.equal(complete(offer,{...input,secondGroupId:sunday.id},'2011-12-10').groups.length,2)
 offer.plans[0]=plan
 const {completeAcademyRequest:save}=load('src/app/actions/academy-request-completion.ts')
 assert.equal((await save(id(10),input)).success,true)
 assert.deepEqual(calls.map(c=>c.name),['academy_request_completion_context','complete_academy_request'])
 assert.equal(calls[1].args.charge_enrollment_input,false);assert.equal(calls[1].args.details_input.quote.plus,50)
 calls=[];assert.ok((await save(id(10),{...input,revision:'b'.repeat(32)})).error);assert.equal(calls.length,1)
 calls=[];assert.ok((await save(id(10),{...input,offerVersion:'old'})).error);assert.equal(calls.length,1)
 calls=[];assert.ok((await save(id(10),{...input,paymentChoice:'transfer'})).error);assert.equal(calls.length,0)
 authorized=false;await assert.rejects(()=>save(id(10),input),/No autorizado/)
 console.log('PASS legacy plan preview/save: price, date, fee, Plus, payment, Sunday, age, stale offer/request, admin-only; saving calls no acceptance, mail or payment provider. Mocks only.')
})().catch(e=>{console.error(e);process.exitCode=1})
