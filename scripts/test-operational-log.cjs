const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path')
const entries=[];const sink={info:v=>entries.push(JSON.parse(v)),warn:v=>entries.push(JSON.parse(v)),error:v=>entries.push(JSON.parse(v))}
const modules=new Map()
function load(file){file=path.resolve(file);if(modules.has(file))return modules.get(file);const m={exports:{}};new Function('module','exports','require','console',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>{if(n==='server-only')return{};if(n.startsWith('.'))return load(path.resolve(path.dirname(file),n+'.ts'));return require(n)},sink);modules.set(file,m.exports);return m.exports}
const api=load('src/lib/operational-log.ts'),instrumentation=load('src/instrumentation.ts')
const secret='private@example.invalid cs_live_private bearer-token secret-password 12345678'
const oldRevision=process.env.VERCEL_GIT_COMMIT_SHA
process.env.VERCEL_GIT_COMMIT_SHA='a'.repeat(40)
api.operationalLog('auth.code_rejected',{source:'portal',status:400,digest:secret,email:secret,password:secret,error:new Error(secret),body:secret})
assert.equal(entries[0].event,'auth.code_rejected');assert.equal(entries[0].level,'warn');assert.equal(entries[0].source,'portal');assert.equal(entries[0].status,400);assert.equal(entries[0].release,'a'.repeat(12));assert.equal(entries[0].digest,undefined)
api.operationalLog('email.delivery_failed',{source:secret,status:999,digest:secret});assert.equal(entries[1].source,undefined);assert.equal(entries[1].status,undefined)
api.operationalLog(secret,{source:'portal'});assert.equal(entries.length,2,'Unknown event strings cannot enter the log')
instrumentation.onRequestError(Object.assign(new Error(secret),{digest:'123456'}),{path:'/portal?email='+secret,headers:{authorization:secret},method:'POST'},{routePath:'/portal/[id]',routeType:'render'})
assert.equal(entries[2].source,'portal');assert.equal(entries[2].digest,'123456');assert.equal(entries[2].event,'request.failed')
instrumentation.register();assert.equal(entries.at(-1).event,'monitoring.ready')
assert(!JSON.stringify(entries).includes('private'));assert(!JSON.stringify(entries).includes('secret-password'));assert(!JSON.stringify(entries).includes('bearer-token'))
process.env.VERCEL_GIT_COMMIT_SHA=secret;api.operationalLog('auth.password_saved');assert.equal(entries.at(-1).release,undefined)
sink.error=()=>{throw Error('log sink unavailable')};assert.doesNotThrow(()=>api.operationalLog('request.failed'))
if(oldRevision===undefined)delete process.env.VERCEL_GIT_COMMIT_SHA;else process.env.VERCEL_GIT_COMMIT_SHA=oldRevision
console.log('PASS operational logs: closed vocabulary, no request/body/error/credential data, bounded status/digest/release, route category only, severity separation, logger failures cannot break user flow. No network or database.')
