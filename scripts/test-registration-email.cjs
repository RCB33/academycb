const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
let calls=0, updates=[], claimed=true, fail=false, details=null, payload
const row={id:'11111111-1111-4111-8111-111111111111',recipient:'test@example.invalid',source_type:'event',event_kind:'received'}
const db={rpc:async()=>({data:claimed?[row]:[],error:null}),from:()=>({update(value){updates.push(value);return {eq(){return {eq:async()=>({error:null})}}}}})}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,name=>{
 if(name==='@/lib/registration-email-details')return {registrationEmailDetails:async()=>details}
 if(name==='server-only')return {}
 if(name==='@/lib/supabase/admin')return {createAdminClient:()=>db}
 if(name==='@/lib/registration-email-content')return load('src/lib/registration-email-content.ts')
 if(name==='@/lib/communication-email')return load('src/lib/communication-email.ts')
 return require(name)
});return m.exports}
;(async()=>{
const content=load('src/lib/registration-email-content.ts')
assert.match(content.registrationEmailContent('event','received').text,/no confirma una plaza ni acredita un pago/)
assert.match(content.registrationEmailContent('event','awaiting_payment').text,/pendiente de comprobación/)
assert.match(content.registrationEmailContent('event','cancelled').text,/no acredita una devolución/)
const oldFetch=global.fetch,oldKey=process.env.RESEND_API_KEY
try {
 process.env.RESEND_API_KEY='test_mock_only'
 global.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],`registration-${row.id}`);payload=JSON.parse(options.body);assert.equal(payload.to[0],row.recipient);return {ok:!fail,status:503,json:async()=>({id:'mock-resend-id'})}}
 const {deliverRegistrationEmail}=load('src/lib/registration-email.ts')
 await deliverRegistrationEmail(row.id);assert.equal(updates.at(-1).status,'sent');assert.equal(calls,1)
 claimed=false;await deliverRegistrationEmail(row.id);assert.equal(calls,1,'Unclaimed/already sent message must not send')
 claimed=true
 details={subject:'¡Enhorabuena, <Alex>!',message:'Plaza aceptada. Importe pendiente: 75 €.',welcome:true,familyAccess:'invited'}
 await deliverRegistrationEmail(row.id)
 assert.match(payload.html,/email\/bienvenida-academy-v1.gif/)
 assert.match(payload.html,/&lt;Alex&gt;/)
 assert.match(payload.html,/Importe pendiente: 75 €/)
 assert.match(payload.html,/código de bienvenida/)
 assert.match(payload.html,/Crea tu contraseña personal/)
 assert.match(payload.html,/test@example.invalid/)
 assert.doesNotMatch(payload.html,/MUESTRA|vista previa/i)
 details=null
 await deliverRegistrationEmail(row.id)
 assert.doesNotMatch(payload.html,/bienvenida-academy-v1.gif|TU PLAZA ESTÁ ACEPTADA/)
 claimed=true;fail=true;await deliverRegistrationEmail(row.id);assert.equal(updates.at(-1).status,'failed');assert.equal(updates.at(-1).last_error,'provider_http_503')
 const sentBeforeMissingKey=calls
 delete process.env.RESEND_API_KEY;await deliverRegistrationEmail(row.id);assert.equal(calls,sentBeforeMissingKey);assert.equal(updates.at(-1).last_error,'missing_api_key')
}finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=oldKey}
console.log('PASS: safe email copy, provider idempotency, claim required, success/failure tracking, missing key. No network or emails.')
})().catch(e=>{console.error(e);process.exitCode=1})
