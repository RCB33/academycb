const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
let logs=[],calls=0,outcome={success:true,message:'Received'}
const m={exports:{}}
new Function('module','exports','require',ts.transpileModule(fs.readFileSync('src/app/api/enrollment/combined/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>{
 if(n==='next/server')return{NextResponse:{json:(body,init)=>Response.json(body,init)}}
 if(n==='@/lib/operational-log')return{operationalLog:(...v)=>logs.push(v)}
 if(n==='@/lib/combined-enrollment-server')return{submitCombinedEnrollment:async()=>{calls++;if(outcome instanceof Error)throw outcome;return outcome}}
 throw Error(n)
})
const post=(body,origin='https://www.academycostabrava.com')=>m.exports.POST(new Request('https://www.academycostabrava.com/api/enrollment/combined',{method:'POST',headers:{origin},body}))
;(async()=>{
 assert.equal((await post('{}','https://other.invalid')).status,403);assert.equal(calls,0)
 assert.equal((await post('invalid')).status,400);assert.equal(calls,0)
 assert.equal((await post('x'.repeat(96001))).status,413);assert.equal(calls,0)
 outcome={success:false,error:'Revisa el grupo'};assert.equal((await post('{}')).status,400)
 outcome=new Error('private@example.invalid');assert.equal((await post('{}')).status,503)
 outcome={success:true,message:'Received'};assert.equal((await post('{"email":"private@example.invalid"}')).status,201)
 assert(logs.some(([e])=>e==='registration.saved'));assert(logs.some(([e])=>e==='request.failed'));assert(!JSON.stringify(logs).includes('private'))
 console.log('PASS: registration API logs receipt, rejected validation, saved and unavailable outcomes without personal data; origin, size and JSON checks preserved. Mock save only.')
})().catch(e=>{console.error(e);process.exitCode=1})
