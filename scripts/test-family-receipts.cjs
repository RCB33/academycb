// Authorization and financial rendering contract; synthetic data, no network.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const id='11111111-1111-4111-8111-111111111111'
let role='guardian',confirmed=true,scoped=true,shopOwner=true,dbError=false,adminReads=0,rendered
const payment={id,type:'academy',ref_id:'order-1',child:{full_name:'QA CHILD'},amount:75,status:'paid',method:'stripe',paid_at:'2026-11-05T10:00:00Z',covered_month:'2026-11',description:'Cuota',manual_receipt_allocations:[]}
function from(table,admin=false){const filters={};let fields='';const q={then(resolve,reject){if(admin)adminReads++;let data=null,error=null;if(dbError)error={message:'Unavailable'};else if(table==='academy_settings')data=[{key:'academy_name',value:'QA Academy'},{key:'prices_include_vat',value:'true'}];else if(table==='orders')data=shopOwner&&filters.customer_email==='parent@example.invalid'&&filters.id==='order-1'?{id:'order-1'}:null;else if(table==='payments'){if(!admin)data=scoped?payment:null;else if(filters.type==='shop'&&payment.type==='shop')data=fields==='id,ref_id'?{id,ref_id:'order-1'}:payment}return Promise.resolve({data,error}).then(resolve,reject)}};q.select=v=>{fields=v;return q};q.eq=(k,v)=>{filters[k]=v;return q};for(const k of ['in','single','maybeSingle'])q[k]=()=>q;return q}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>{
 if(n==='@/lib/auth')return {requireRole:async allowed=>{if(!allowed.includes(role))throw Error('Denied');return {role,user:{email:'Parent@Example.invalid',email_confirmed_at:confirmed?'2026-01-01':null},supabase:{from:t=>from(t)}}}}
 if(n==='@/lib/supabase/admin')return {createAdminClient:()=>({from:t=>from(t,true)})}
 if(n==='@/lib/receipt-balance')return load('src/lib/receipt-balance.ts')
 if(n==='@/components/admin/payment-receipt-pdf')return {PaymentReceiptPdf:({data})=>{rendered=data;return data}}
 if(n==='@react-pdf/renderer')return {renderToBuffer:async()=>Buffer.from('%PDF-QA')}
 return require(n)
 });return m.exports}
const {GET}=load('src/app/api/payments/[id]/receipt/route.ts')
const get=(value=id)=>GET(new Request('https://academy.test/api/payments/'+value+'/receipt'),{params:Promise.resolve({id:value})})
;(async()=>{
 let r=await get();assert.equal(r.status,200);assert.equal(rendered.paid,75);assert.equal(rendered.remaining,0);assert.equal(rendered.month,'2026-11');assert.equal(rendered.pricesIncludeVat,true);assert.equal(rendered.entries[0].method,'stripe');assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(adminReads,0)
 payment.status='pending';payment.manual_receipt_allocations=[{amount:20,paid_date:'2026-11-05',method:'cash',voided_at:null},{amount:10,paid_date:'2026-11-06',method:'cash',voided_at:'2026-11-07'}];await get();assert.equal(rendered.paid,20);assert.equal(rendered.remaining,55);assert.equal(rendered.status,'Pagado parcialmente')
 scoped=false;assert.equal((await get()).status,404,'other family receipt must stay hidden')
 payment.type='shop';assert.equal((await get()).status,200,'verified order buyer can download own receipt')
 shopOwner=false;assert.equal((await get()).status,404,'other buyer rejected')
 shopOwner=true;confirmed=false;const reads=adminReads;assert.equal((await get()).status,404);assert.equal(adminReads,reads,'unconfirmed email cannot look up orders')
 for(role of ['anonymous','coach','staff'])assert.equal((await get()).status,403)
 for(role of ['admin','finance']){scoped=true;assert.equal((await get()).status,200)}
 assert.equal((await get('invalid-id')).status,400)
 dbError=true;assert.equal((await get()).status,500,'database failure must not produce a misleading receipt')
 console.log('PASS: family RLS receipt, verified shop buyer, other family/buyer and unverified email denied, admin/finance, partial/voided/Stripe amounts, private PDF response. No writes.')
})().catch(e=>{console.error(e);process.exitCode=1})
