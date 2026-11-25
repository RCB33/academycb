const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
let locale='es';const modules=new Map()
function load(file){file=path.resolve(file);if(modules.has(file))return modules.get(file);const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(m,m.exports,n=>{if(n==='@/lib/i18n/client')return{useLocale:()=>locale};if(n.startsWith('@/'))return load('src/'+n.slice(2)+'.ts');if(n.startsWith('.'))return load(path.resolve(path.dirname(file),n+'.ts'));return require(n)});modules.set(file,m.exports);return m.exports}
const {familyPaymentsOverview:overview,paymentChannel:channel}=load('src/lib/family-payments-overview.ts')
const receipt=(id,child,due,amount=75)=>({id,child_id:child,ref_id:'m'+child,type:'academy',description:'Mensualidad',amount,status:'pending',due_date:due,paid_at:null,method:null,covered_month:due?.slice(0,7),manual_receipt_allocations:[]})
const receipts=['a','b'].flatMap(c=>[receipt(c+'dec',c,'2026-12-01'),{...receipt(c+'plus',c,'2026-12-01',50),description:'Plus anual'},receipt(c+'jan',c,'2027-01-01')])
let r=overview(receipts,'2026-11-25');assert.equal(r.dueTotal,0);assert.equal(r.nextTotal,250);assert.equal(r.nextDate,'2026-12-01');assert.equal(r.history.length,0);assert.equal(r.future.length,6)
assert.equal(overview(receipts,'2026-11-25','a').nextTotal,125)
const paid={...receipt('paid','a','2026-10-01'),status:'paid',paid_at:'2026-10-05T18:00:00Z',created_at:'2026-08-01',method:'cash'}
const partial={...receipt('partial','a','2026-11-01'),manual_receipt_allocations:[{amount:20,paid_date:'2026-11-03',method:'cash',voided_at:null},{amount:10,paid_date:'2026-11-04',method:'cash',voided_at:'2026-11-05'}]}
const cancelled={...receipt('cancelled','a','2026-10-01'),status:'cancelled'},refunded={...paid,id:'refund',status:'refunded'}
r=overview([...receipts,paid,partial,cancelled,refunded,receipt('undated','b',null)],'2026-11-25');assert.equal(r.dueTotal,55);assert.equal(r.history[0].amount,20);assert.equal(r.history[0].date,'2026-11-03');assert.equal(r.history[1].date,'2026-10-05');assert.equal(r.undated.length,1);assert.equal(r.archived.length,2)
assert.equal(overview([{...paid,paid_at:null}],'2026-11-25').history[0].date,null,'Never invent payment date from creation date')
const plans=['a','b'].map(c=>({id:'m'+c,child_id:c,status:'active',start_date:'2026-12-01',end_date:'2027-05-31',monthly_price:75,agreed_payment_method:'cash',plan_snapshot:{name:'Academia',frequency:'mensual'},plan:null}))
assert.equal(channel(receipts[0],plans,[],[],'live'),'cash')
const req={id:'r',mode:'live',state:'active',kind:'subscription',billing_request_items:[{payment_id:receipts[0].id}],billing_request_attempts:[]}
assert.notEqual(channel(receipts[0],plans,[req],[],'live'),'automatic','Preference/request state alone is not automatic authorization')
req.billing_request_attempts=[{state:'active',billing_status:'scheduled',schedule_id:'sched',subscription_id:null}];assert.equal(channel(receipts[0],plans,[req],[],'live'),'automatic')
assert.equal(channel(receipts[0],plans,[{...req,mode:'test'}],[],'live'),'cash')
assert.equal(channel({...receipts[0],status:'failed'},plans,[req],[],'live'),'attention','Failed payment must not promise an automatic charge')
req.billing_request_attempts[0].billing_status='attention';assert.equal(channel(receipts[0],plans,[req],[],'live'),'attention')
req.billing_request_attempts=[];req.state='processing';assert.equal(channel(receipts[0],plans,[req],[],'live'),'processing')
const Component=load('src/components/portal/payments-overview.tsx').PaymentsOverview
for(locale of ['es','ca','en']){const html=renderToStaticMarkup(React.createElement(Component,{students:[{id:'a',full_name:'Jugador A'},{id:'b',full_name:'Jugador B'}],plans,receipts,requests:[],contracts:[],today:'2026-11-25',mode:'live',management:React.createElement('p',null,'Opciones de autorización')}));assert(html.includes('250'));assert(html.includes('150'));assert(!html.includes('<details open'));assert(html.indexOf('250')<html.indexOf('Opciones de autorización'));assert(!html.includes('Saldo pendiente registrado'));if(locale==='es'&&process.argv.includes('--render'))fs.writeFileSync('/tmp/academy-payments-overview.html',html)}
console.log('PASS next due vs future, family/player scope, actual payment dates, partial/void/refund, unknown dates, consent vs active subscription, failed states, ES/CA/EN rendering and collapsed secondary sections. No services or writes.')
