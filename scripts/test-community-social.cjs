const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const user={id:'11111111-1111-4111-8111-111111111111'},post='22222222-2222-4222-8222-222222222222',comment='33333333-3333-4333-8333-333333333333'
let calls=[],authError=false,writeError=null,deleted=[{id:comment}],retry=null
const db={rpc:async(name,args)=>{calls.push(['rpc',name,args]);return {data:[{likes:2,liked:true,comments:1}]}},from(table){const q={select(...a){calls.push(['select',...a]);return q},eq(...a){calls.push(['eq',...a]);return q},order(){return q},range(){return q},maybeSingle:async()=>({data:retry}),upsert:async(...a)=>{calls.push(['upsert',table,...a]);return {error:writeError}},insert:async(...a)=>{calls.push(['insert',table,...a]);return {error:writeError}},delete(){calls.push(['delete',table]);return q},then(resolve){return Promise.resolve({data:table==='community_post_comments'?deleted:[],error:writeError}).then(resolve)}};return q}}
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,name=>{if(name==='@/lib/auth')return {requireUser:async()=>{if(authError)throw Error('No autorizado');return {supabase:db,user}}};if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');return require(name)});return m.exports}
;(async()=>{
 const {wallPostPath,wallReturnPath}=load('src/lib/community-social.ts'),{portalReturnPath}=load('src/lib/portal-return.ts'),a=load('src/app/actions/community-social.ts')
 assert.equal(portalReturnPath(wallPostPath(post)),`/portal/muro/publicacion/${post}`)
 assert.equal(portalReturnPath(`/portal/pagos/solicitud/${post}`),`/portal/pagos/solicitud/${post}`)
 for(const bad of ['https://evil.example','//evil.example','/portal/muro/publicacion/'+post+'?next=https://evil.example','/portal/muro/publicacion/../admin',null])assert.equal(wallReturnPath(bad),null)
 assert.throws(()=>wallPostPath('../admin'))
 assert.equal((await a.setCommunityLike('bad',true)).success,false);assert.equal(calls.length,0)
 assert.equal((await a.setCommunityLike(post,true)).success,true);assert.deepEqual(calls.find(c=>c[0]==='upsert').slice(2),[{post_id:post,user_id:user.id},{onConflict:'post_id,user_id',ignoreDuplicates:true}])
 calls=[];await a.setCommunityLike(post,false);assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]===user.id))
 calls=[];assert.equal((await a.addCommunityComment(post,comment,'   ')).success,false);assert.equal(calls.length,0)
 assert.equal((await a.addCommunityComment(post,comment,'¡Enhorabuena!')).success,true)
 assert.deepEqual(calls.find(c=>c[0]==='insert')[2],{id:comment,post_id:post,author_user_id:user.id,body:'¡Enhorabuena!'})
 writeError={code:'23505'};retry={id:comment};assert.equal((await a.addCommunityComment(post,comment,'¡Enhorabuena!')).success,true)
 retry=null;assert.equal((await a.addCommunityComment(post,comment,'Distinto')).success,false)
 writeError=null;assert.equal((await a.getCommunityComments(post,-1)).success,false)
 deleted=[];assert.equal((await a.deleteCommunityComment(comment)).success,false)
 deleted=[{id:comment}];assert.equal((await a.deleteCommunityComment(comment)).success,true)
 authError=true;assert.equal((await a.setCommunityLike(post,true)).success,false)
 console.log('PASS social actions: validation, Auth, like idempotency, own unlike, comment retries, RLS delete result, strict internal sharing/login return. No network or real content.')
})().catch(e=>{console.error(e);process.exitCode=1})
