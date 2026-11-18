const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
let calls=0, updates=[], claimed=true, fail=false
const row={id:'11111111-1111-4111-8111-111111111111',recipient:'test@example.invalid',source_type:'event',event_kind:'received'}
const db={rpc:async()=>({data:claimed?[row]:[],error:null}),from:()=>({update(value){updates.push(value);return {eq(){return {eq:async()=>({error:null})}}}}})}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,name=>{
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
 global.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],`registration-${row.id}`);assert.equal(JSON.parse(options.body).to[0],row.recipient);return {ok:!fail,status:503,json:async()=>({id:'mock-resend-id'})}}
 const {deliverRegistrationEmail}=load('src/lib/registration-email.ts')
 await deliverRegistrationEmail(row.id);assert.equal(updates.at(-1).status,'sent');assert.equal(calls,1)
 claimed=false;await deliverRegistrationEmail(row.id);assert.equal(calls,1,'Unclaimed/already sent message must not send')
 claimed=true;fail=true;await deliverRegistrationEmail(row.id);assert.equal(updates.at(-1).status,'failed');assert.equal(updates.at(-1).last_error,'provider_http_503')
 delete process.env.RESEND_API_KEY;await deliverRegistrationEmail(row.id);assert.equal(calls,2);assert.equal(updates.at(-1).last_error,'missing_api_key')
}finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=oldKey}
console.log('PASS: safe email copy, provider idempotency, claim required, success/failure tracking, missing key. No network or emails.')
})().catch(e=>{console.error(e);process.exitCode=1})
