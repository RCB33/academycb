const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript'), sharp = require('sharp')
let uploads=[], inserts=[], removals=[], uploadError=null, insertError=null, denied=false
const db={storage:{from(bucket){assert.equal(bucket,'community-wall');return {upload:async(...args)=>{uploads.push(args);return {error:uploadError}},remove:async(paths)=>{removals.push(paths);return {error:null}}}}},from(table){assert.equal(table,'community_posts');return {insert:async(row)=>{inserts.push(row);return {error:insertError}}}}}
const m={exports:{}}
new Function('module','exports','require',ts.transpileModule(fs.readFileSync('src/app/actions/community-wall.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(m,m.exports,name=>name==='@/lib/auth'?{requireAdmin:async()=>{if(denied)throw Error('Unauthorized');return {supabase:db,user:{id:'11111111-1111-4111-8111-111111111111'}}}}:name==='next/cache'?{revalidatePath(){}}:require(name))
function data(file){const f=new FormData();f.set('body','Bienvenidas, familias Academy');if(file)f.set('photo',file);return f}
;(async()=>{
 const action=m.exports.createAcademyWallPost
 assert.equal((await action(data())).success,true);assert.equal(inserts[0].media_path,null)
 const photo=new File([fs.readFileSync('public/academia/galeria/foto-01.webp')],'team.webp',{type:'image/webp'})
 assert.equal((await action(data(photo))).success,true)
 assert.match(uploads[0][0],/^11111111-1111-4111-8111-111111111111\/[\da-f-]+\.webp$/)
 const meta=await sharp(uploads[0][1]).metadata();assert.equal(meta.format,'webp');assert.ok(meta.width<=1600&&meta.height<=1600);assert.equal(meta.exif,undefined)
 assert.equal(inserts[1].media_path,uploads[0][0]);assert.equal(inserts[1].author_user_id,'11111111-1111-4111-8111-111111111111')
 const before=uploads.length
 assert.equal((await action(data(new File(['fake'],'bad.webp',{type:'image/webp'})))).success,false)
 assert.equal((await action(data(new File([new Uint8Array(3*1024*1024+1)],'big.png',{type:'image/png'})))).success,false)
 assert.equal((await action(data(new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'})))).success,false)
 assert.equal(uploads.length,before)
 uploadError={message:'fail'};const n=inserts.length;assert.equal((await action(data(photo))).success,false);assert.equal(inserts.length,n)
 uploadError=null;insertError={message:'fail'};assert.equal((await action(data(photo))).success,false);assert.deepEqual(removals.at(-1),[uploads.at(-1)[0]])
 denied=true;await assert.rejects(()=>action(data(photo)),/Unauthorized/)
 console.log('PASS admin wall photo: authentication, real image decode, metadata removal, size/type/corruption checks, private storage, error cleanup; no network writes.')
})().catch(e=>{console.error(e);process.exitCode=1})
