const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const plan={id:'p',name:'Academia',description:'',sessions_per_week:1,price:75,enrollment_fee:30,season_start:'2026-09-15',season_end:'2027-05-31',is_active:true,updated_at:'2026-11-20'}
const group={id:'g',name:'Grupo',schedule:'17:30',category_id:null,max_players:null,status:'active',updated_at:'2026-11-20',public_offer:{day:'Martes',kind:'field',location:'Campo',birth_from:null,birth_to:null,published:true,note:'',order:0}}
const tables={teams:[group],membership_plans:[plan]}
const db={from(t){const q={select(){return q},not(){return q},order(){return q},then(a,b){return Promise.resolve({data:tables[t],error:null}).then(a,b)}};return q}}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>{
 if(n==='server-only')return{}
 if(n==='@/lib/supabase/admin')return{createAdminClient:()=>db}
 if(n==='@/lib/stripe-availability')return{stripeCheckoutMode:async()=>null}
 if(n==='@/components/forms/form-draft')return{DraftInput:'input',DraftSelect:'select',useDraftState:(k,v)=>[k.endsWith('plan')?'p':k.endsWith('date')?'2026-09-15':v,()=>{}]}
 if(n==='./enrollment-payment-choice')return{EnrollmentPaymentChoice:'payment-choice'}
 if(n.startsWith('@/lib/'))return load('src/lib/'+n.slice(6)+'.ts')
 if(n==='./billing-request')return{}
 return require(n)
});return m.exports}
function find(n,p){if(!n||typeof n!=='object')return null;if(p(n))return n;for(const c of [n.props?.children].flat(Infinity)){const r=find(c,p);if(r)return r}return null}
;(async()=>{
 const {getAcademyOffer,academySelection}=load('src/lib/offering-server.ts'),offer=await getAcademyOffer()
 const args={plan_id:'p',group_id:'g',start_date:'2026-09-15',plus:false,offer_version:offer.version,payment_choice:'cash'}
 for(const payment_choice of ['cash','monthly_card']){const r=await academySelection({...args,payment_choice},'2016-01-01');assert.equal(r.start_date,'2026-09-15');assert.equal(r.quote.first_month,56.25);assert.equal(r.quote.remaining.length,8);assert.equal(r.quote.remaining[0].month,'2026-10')}
 for(const date of ['2026-09-14','2027-06-01','2026-02-30',''])await assert.rejects(()=>academySelection({...args,start_date:date},'2016-01-01'))
 assert.equal((await academySelection({...args,start_date:'2027-05-31'},'2016-01-01')).quote.remaining.length,0)
 await assert.rejects(()=>academySelection({...args,offer_version:'stale'},'2016-01-01'),/han cambiado/)
 const {AcademySelection}=load('src/app/(public)/inscripcion/academy-selection.tsx'),tree=AcademySelection({prefix:'',offer})
 const date=find(tree,n=>n.type==='input'&&n.props.type==='date');assert.equal(date.props.min,'2026-09-15');assert.equal(date.props.max,'2027-05-31');assert(find(tree,n=>n.props?.role==='status'))
 const {monthlyCardCandidates}=load('src/lib/parent-monthly-card.ts')
 const m={id:'m',child_id:'c',status:'active',plan_snapshot:{frequency:'mensual'},history_review_required:true,history_reviewed_at:null},p={id:'p',ref_id:'m',type:'academy',concept_code:'monthly',status:'pending',due_date:'2027-01-01'}
 assert.equal(monthlyCardCandidates([m],[p],[],[],'test','2026-11-27',0).length,0)
 assert.equal(monthlyCardCandidates([{...m,history_reviewed_at:'2026-11-27'}],[p],[],[],'test','2026-11-27',0).length,1)
 console.log('PASS: past dates accepted for cash/card, season and calendar boundaries, stale offers, correct proration/calendar, rendered date limits/warning and parent card review gate. No network or charges.')
})().catch(e=>{console.error(e);process.exitCode=1})
