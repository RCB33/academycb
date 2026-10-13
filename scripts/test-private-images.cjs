const assert=require('node:assert/strict'), fs=require('node:fs'), ts=require('typescript')
let signedIn=true,visible=false,downloads=0
const m={exports:{}}
const client={auth:{getUser:async()=>({data:{user:signedIn?{id:'test'}:null}})},from:()=>({select:()=>({eq:()=>({limit:async()=>({data:visible?[{id:'test'}]:[],error:null})})})})}
new Function('module','exports','require',ts.transpileModule(fs.readFileSync('src/app/api/profile-image/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>{
 if(n==='@/lib/supabase/server')return {createClient:async()=>client}
 if(n==='@/lib/supabase/admin')return {createAdminClient:()=>({storage:{from:()=>({download:async()=>{downloads++;return {data:new Blob(['test'],{type:'image/png'}),error:null}}})}})}
 throw Error(n)
})
;(async()=>{
 const get=path=>m.exports.GET(new Request(`https://example.org/api/profile-image?path=${encodeURIComponent(path)}`))
 assert.equal((await get('../secret')).status,400)
 signedIn=false;assert.equal((await get('student-avatars/test.png')).status,401)
 signedIn=true;assert.equal((await get('student-avatars/test.png')).status,403)
 assert.equal(downloads,0)
 visible=true;const result=await get('student-avatars/test.png');assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(downloads,1)
 console.log('PASS: private images reject anonymous, unauthorized and traversal requests; authorized images bypass shared caches')
})().catch(e=>{console.error(e);process.exitCode=1})
