const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const cache={}
let family=null, saved=[], delivered=[], campus, catalog
const plan={id:'11111111-1111-4111-8111-111111111111',name:'Academia',description:'',sessions_per_week:1,price:75,enrollment_fee:30,season_start:'2026-09-15',season_end:'2027-05-31',is_active:true,updated_at:''}
const group='22222222-2222-4222-8222-222222222222'
const offer={plans:[plan],groups:[],version:'a'}
const db={rpc:async(name,args)=>{saved.push({name,args});return {data:args.players.flatMap(p=>[...p.enrollments.map(e=>({source:'enrollment',id:e.id})),...(p.event?[{source:'event',id:p.event.payload.request_id}]:[])]),error:null}}}
function load(file){if(cache[file])return cache[file];const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(m,m.exports,name=>{
 if(name==='server-only')return {}
 if(name==='@/lib/supabase/admin')return {createAdminClient:()=>db}
 if(name==='@/lib/family-context')return {getFamilyContext:async()=>family}
 if(name==='@/lib/registration-email')return {deliverRegistrationEmails:async(...a)=>{delivered.push(a)}}
 if(name==='@/lib/enrollment')return {enrollmentSchema:require('zod').z.object({child_name:require('zod').z.string().min(2),birth_date:require('zod').z.string().regex(/^\d{4}-\d{2}-\d{2}$/),guardian_name:require('zod').z.string().min(2),phone:require('zod').z.string().min(9),email:require('zod').z.email(),linked_child_id:require('zod').z.string().optional()})}
 if(name==='@/lib/offering-server')return {getCampusOffer:async id=>id===campus.id?campus:null,getTournamentOffer:async()=>catalog,academySelection:async a=>{if(!['cash','monthly_card'].includes(a.payment_choice))throw Error('payment invalid');if(a.offer_version!=='a')throw Error('changed');return {plan,quote:load('src/lib/offering.ts').academyQuote(plan,a.start_date,a.plus)}}}
 if(name==='@/components/forms/form-draft')return {}
 if(name==='@/lib/i18n/client')return {}
 if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts')
 return require(name)
});return cache[file]=m.exports}
;(async()=>{
 const {combinedQuote,combinedFormData}=load('src/lib/combined-enrollment.ts')
 const {birthDateValue}=load('src/components/ui/birth-date-input.tsx')
 assert.equal(birthDateValue('2016','2','29'),'2016-02-29');assert.equal(birthDateValue('2017','2','29'),'');assert.equal(birthDateValue('2016','4','31'),'');assert.equal(birthDateValue('2016','4',''),'')
 campus={id:'33333333-3333-4333-8333-333333333333',name:'Campus Navidad',updated_at:'c',end_date:'2027-01-07',schedule:'9–13',location:'Campo',public_program:{weeks:[{id:'1',label:'A',price:89},{id:'2',label:'B',price:99},{id:'3',label:'C',price:89}],pack_price:197,birth_from:2013,birth_to:2022,sibling_discount:5}}
 catalog={version:'t',events:['231','champions','costa-brava'].map(id=>({id,name:id,date:'Diciembre',categories:['S10']})),prices:[65,120,165],kit_price:55}
 const a={plan_id:plan.id,group_id:group,start_date:'2026-11-20',plus:'yes',offer_version:'a',payment_choice:'cash'}
 const c={payment_choice:'cash',campus_id:campus.id,offer_version:'c',team:'Sin equipo',role:'Jugador de campo',allergies:'Ninguna',health_card:'QA',medical_consent:'Sí',weeks:['1','2','3'],preferences:'',size:'12',sibling:true,sibling_name:'Hermano QA',image_consent:'No',reason:'Deporte',expectations:'Aprender',payment_consent:true,health_consent:true,terms_consent:true}
 const t={payment_choice:'transfer',offer_version:'t',club:'Sin equipo',coach:'',category:'S10',level:'sin_equipo',tournaments:['231','champions','costa-brava'],owns_kit:false,shirt_size:'12',shorts_size:'12',socks_size:'34',champions_clothing:false,image_consent:false,participation_consent:true}
 const child={child_name:'Jugador QA',birth_date:'2016-02-29',linked_child_id:'',academy:a,campus:c,tournament:t}
 let q=combinedQuote([child],offer,[campus],catalog)
 assert.equal(q.initial,117.5+197+220);assert.equal(q.monthly[0].amount,75);assert.equal(q.monthly[0].count,6);assert.equal(q.complete,true)
 for(let n=1;n<=3;n++){q=combinedQuote([{...child,academy:undefined,campus:undefined,tournament:{...t,tournaments:t.tournaments.slice(0,n),owns_kit:true}}],offer,[campus],catalog);assert.equal(q.initial,[65,120,165][n-1])}
 assert.equal(combinedQuote([{...child,campus:{...c,weeks:[]}}],offer,[campus],catalog).complete,false)
 assert.equal(combinedQuote([{child_name:'QA'}],offer,[campus],catalog).complete,false)
 const fd=new FormData();fd.set('player_2_child_name','QA');fd.set('player_2_academy','on');fd.set('player_2_plus','yes');fd.set('player_2_campus','on');fd.append('player_2_campus_weeks','1');fd.append('player_2_campus_weeks','3');fd.set('player_2_tournament','on');fd.set('player_2_tournament_owns_kit','yes');
 const read=combinedFormData(fd,[2],'id');assert.deepEqual(read.children[0].campus.weeks,['1','3']);assert.equal(read.children[0].academy.plus,'yes');assert.equal(read.children[0].tournament.owns_kit,true)
 const {submitCombinedEnrollment:submit}=load('src/lib/combined-enrollment-server.ts')
 const payload={request_id:'44444444-4444-4444-8444-444444444444',guardian_name:'Tutor QA',email:'qa@example.invalid',phone:'600000000',notes:'',privacy_consent:true,terms_consent:true,website:'',children:[child]}
 let res=await submit(payload);assert.equal(res.success,false);assert.equal(saved.length,0)
 family={userId:'55555555-5555-4555-8555-555555555555',email:'verified@example.invalid',children:[]}
 res=await submit(payload);assert.equal(res.success,true);assert.equal(saved.length,1);assert.equal(delivered.length,3)
 assert.equal(saved[0].args.players[0].event.quote,220);assert.equal(saved[0].args.players[0].enrollments[1].campus_details.quoted_amount,197)
 assert.equal(saved[0].args.players[0].enrollments[0].email,family.email)
 assert.equal(saved[0].args.players[0].enrollments[1].campus_details.payment_choice,'cash')
 res=await submit({...payload,children:[{...child,campus:{...c,payment_choice:'monthly_card'}}]});assert.equal(res.success,false)
 res=await submit({...payload,children:[{...child,tournament:{...t,payment_choice:'cash'}}]});assert.equal(res.success,false)
 res=await submit({...payload,children:[{...child,academy:{...a,payment_choice:'transfer'}}]});assert.equal(res.success,false)
 res=await submit({...payload,children:[{...child,campus:undefined,academy:{...a,payment_choice:'transfer'}}]});assert.equal(res.success,false)
 const before=saved.length
 res=await submit({...payload,children:[child,child]});assert.equal(res.success,false)
 res=await submit({...payload,children:[{...child,linked_child_id:group}]});assert.equal(res.success,false)
 res=await submit({...payload,children:[{...child,campus:{...c,offer_version:'old'}}]});assert.equal(res.success,false)
 res=await submit({...payload,children:[{...child,tournament:{...t,category:'S7'}}]});assert.equal(res.success,false)
 res=await submit({...payload,children:[{...child,campus:{...c,weeks:[]}}]});assert.equal(res.success,false)
 assert.equal(saved.length,before)
 family=null;res=await submit({...payload,children:[{...child,tournament:undefined}]});assert.equal(res.success,false)
 res=await submit({...payload,children:[{...child,tournament:undefined,campus:undefined}]});assert.equal(res.success,true)
 console.log('PASS: complete birth dates, combined totals, installments separate, pack prices, form arrays, verified ownership, anonymous academy/campus, all validation before save, email queues mocked. No network or emails.')
})().catch(e=>{console.error(e);process.exitCode=1})
