const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function load(file) {
    const m = { exports: {} }
    new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(m,m.exports,name=>{
        if(name==='next/link') return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}
        if(!name.startsWith('@/')&&!name.startsWith('.'))return require(name)
        const base=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(file),name)
        if(base.endsWith('.json'))return JSON.parse(fs.readFileSync(base,'utf8'))
        return load(base+(fs.existsSync(base+'.ts')?'.ts':'.tsx'))
    })
    return m.exports
}
const {MonthlyCardOption,monthlyCardRequests}=load('src/components/portal/monthly-card-option.tsx')
const now=Date.parse('2026-11-24T12:00:00Z')
const request={id:'11111111-1111-4111-8111-111111111111',child_id:'child',guardian_id:'guardian',kind:'subscription',mode:'live',title:'Academia · Familia de prueba',state:'ready',total_cents:15000,expires_at:'2026-12-01T00:00:00Z',created_at:'2026-11-24',email_status:'pending',billing_request_items:[{payment_id:'first',position:0,amount_cents:7500,due_date:'2026-12-01',phase:'recurring',snapshot:{type:'academy',description:'Diciembre'}},{payment_id:'second',position:1,amount_cents:7500,due_date:'2027-01-01',phase:'recurring',snapshot:{type:'academy',description:'Enero'}}]}
const render=(patch={})=>renderToStaticMarkup(React.createElement(MonthlyCardOption,{requests:[request],mode:'live',enabled:true,now,...patch}))
assert.match(render(),/Añadir tarjeta y activar mensualidades/)
assert.ok(render().includes('/portal/pagos/solicitud/'+request.id))
assert.ok(!render().includes('checkout.stripe.com')) // Review/consent must precede checkout.
assert.match(render(),/75,00/)
assert.match(render({enabled:false}),/todavía no está disponible/)
assert.ok(!render({enabled:false}).includes('Añadir tarjeta y activar mensualidades'))
for(const state of ['active','processing','cancelling']) {
    const html=render({requests:[{...request,state}]})
    assert.ok(!html.includes('Añadir tarjeta y activar mensualidades'))
    assert.ok(!html.includes('Solicitar activación por WhatsApp'))
}
for(const expires_at of ['2026-11-23','bad-date']) {
    const html=render({requests:[{...request,expires_at}]})
    assert.match(html,/ha caducado/)
    assert.ok(!html.includes('Añadir tarjeta y activar mensualidades'))
}
assert.match(render({requests:[{...request,billing_request_items:[{...request.billing_request_items[0],phase:'initial'},request.billing_request_items[1]]}]}),/primer pago al completar Stripe/)
assert.match(render({requests:[]}),/No hay mensualidades futuras disponibles/)
assert.match(render({requests:[],selfService:React.createElement('button',null,'Activar mis cuotas')}),/Activar mis cuotas/)
assert.ok(!render({requests:[],selfService:React.createElement('button',null,'Activar mis cuotas')}).includes('Secretaría debe preparar'))
assert.ok(!render({requests:[],selfService:React.createElement('button',null,'Activar mis cuotas'),viewOnly:true}).includes('Activar mis cuotas'))
assert.ok(!render({requests:[],viewOnly:true}).includes('href="https://wa.me'))
assert.ok(!render({requests:[],legacyInProgress:true}).includes('Solicitar activación por WhatsApp'))
assert.match(render({mode:'test',requests:[{...request,mode:'test'}]}),/tarjetas de prueba/)
assert.equal(monthlyCardRequests([request,{...request,mode:'test'}],'live').length,1)
assert.equal(monthlyCardRequests([{...request,kind:'payment'}],'live').length,0)
assert.equal(monthlyCardRequests([{...request,billing_request_items:request.billing_request_items.map(i=>({...i,snapshot:{type:'campus'}}))}],'live').length,0)
assert.equal(monthlyCardRequests([{...request,billing_request_items:request.billing_request_items.map(i=>({...i,phase:'initial'}))}],'live').length,0)
assert.equal(monthlyCardRequests([{...request,state:'cancelled'}],'live').length,0)
assert.match(render({locale:'ca'}),/Pagament mensual amb targeta/)
assert.match(render({locale:'en'}),/Monthly card payments/)
console.log('PASS: parent monthly card CTA, review before checkout, initial charge, availability, expiry, active/processing/cancelling, family requests, test/live separation and ES/CA/EN. No writes or Stripe requests.')
