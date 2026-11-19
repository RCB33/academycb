const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(file, imports = {}) {
 const m = {exports:{}}
 new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(m,m.exports,name => Object.hasOwn(imports,name) ? imports[name] : require(name))
 return m.exports
}
const {FAMILY_NAVIGATION: nav,isFamilyRouteCurrent: active}=load('src/lib/family-navigation.ts')
assert.deepEqual(nav.filter(x=>x.primary).map(x=>x.href),['/portal/dashboard','/portal/calendario','/portal/pagos','/portal/comunicados'])
for(const item of nav){assert.ok(item.href.startsWith('/portal/'));assert.ok(fs.existsSync(`src/app/portal/(authenticated)/${item.href.slice(8)}/page.tsx`),item.href)}
assert.equal(active('/portal/11111111-1111-4111-8111-111111111111','/portal/dashboard'),true)
assert.equal(active('/portal/pagos/solicitud/example','/portal/pagos'),true)
assert.equal(active('/portal/torneos','/portal/dashboard'),false)
assert.equal(active('/portal/pagos-extra','/portal/pagos'),false)
let checkout
class StripeMock { constructor(){this.checkout={sessions:{create:async (params)=>{checkout=params;return {id:'cs_test_fixture',url:'https://checkout.stripe.com/test-fixture',livemode:false}}}}} }
const {createReceiptCheckout}=load('src/lib/stripe-payments.ts',{'server-only':{},stripe:StripeMock,'./payment-rules':{validatePaymentEnvironment:()=> 'test'}})
const redirect=location=>{throw {redirect:location}}
let role='guardian', user={id:'test-family'}
const publicPage=load('src/app/(public)/torneos/inscripcion/page.tsx',{
 '@/lib/i18n/server':{getT:async()=>Object.assign(x=>x,{locale:'es-ES'})},'@/lib/i18n/translate':{translateMetadata:x=>x},
 '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role}})})})})})},
 '@/app/actions/event-registrations':{getEventFamily:async()=>({registrations:[]})},'./registration-form':{EventRegistrationForm:()=>null},'./access':{EventAccess:()=>null},'next/navigation':{redirect},'next/link':()=>null
}).default
;(async()=>{
 for(const kind of ['event','receipt']){
  await createReceiptCheckout({kind,attemptId:'11111111-1111-4111-8111-111111111111',amountCents:6500,description:'Mock',returnOrigin:'https://www.academycostabrava.com',expiresAt:2000000000})
  const route=kind==='event'?'/portal/torneos':'/portal/pagos'
  assert.ok(checkout.success_url.startsWith('https://www.academycostabrava.com'+route+'?attempt='))
  assert.ok(checkout.cancel_url.includes(route+'?attempt=')); assert.equal(checkout.line_items[0].price_data.unit_amount,6500)
 }
 await assert.rejects(publicPage({searchParams:Promise.resolve({torneo:'costa-brava',attempt:'test-attempt'})}),e=>e.redirect==='/portal/torneos?torneo=costa-brava&attempt=test-attempt')
 user=null; await publicPage({searchParams:Promise.resolve({})})
 user={id:'test-admin'};role='admin';await publicPage({searchParams:Promise.resolve({})})
 console.log('PASS: every family navigation destination exists, mobile priorities, nested active states, authenticated tournament redirect with parameters, anonymous/admin entry, and mocked payment return paths')
})().catch(e=>{console.error(e);process.exitCode=1})
