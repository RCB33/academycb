const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),sharp=require('sharp');
function load(path,mocks={}){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(m,m.exports,n=>n==='server-only'?{}:mocks[n]||require(n));return m.exports}
const photo=load('src/lib/player-photo.ts'),evaluation=load('src/lib/player-evaluation.ts');
let authorized=true,childVisible=true,mediaVisible=true,serviceCalls=0,uploadCalls=0,scoreWrites=[];const childId='11111111-1111-4111-8111-111111111111',imageId='22222222-2222-4222-8222-222222222222';
const query=(value)=>{const q={select:()=>q,eq:()=>q,is:()=>q,maybeSingle:async()=>({data:value,error:null})};return q};
const scoped={from:table=>query(table==='children'?(childVisible?{id:childId}:null):mediaVisible?{child_id:childId,url:childId+'/photo.webp'}:null)};
const route=load('src/app/api/player-gallery/[id]/route.ts', {
 '@/lib/auth':{requireRole:async()=>{if(!authorized)throw Error('denied');return {supabase:scoped}}},
 '@/lib/supabase/admin':{createAdminClient:()=>{
  serviceCalls++;
  return {storage:{from:()=>({download:async()=>({data:new Blob(['photo'],{type:'image/webp'}),error:null})})}};
 }},
});
const upload=load('src/app/actions/player-photo.ts',{'next/cache':{revalidatePath:()=>{}},'@/lib/player-photo-access':{requirePlayerPhotoAccess:async()=>{if(!authorized)throw Error('denied')}},'@/lib/player-photo':photo,'@/lib/supabase/admin':{createAdminClient:()=>{uploadCalls++;throw Error('upload should not run')}}});
const metricsClient={from:table=>{if(table==='children')return query(childVisible?{id:childId}:null);const q=query(null);q.upsert=async data=>{scoreWrites.push(data);return {error:null}};return q}};
let role='coach';const metrics=load('src/app/actions/metrics.ts',{'next/cache':{revalidatePath:()=>{}},'@/lib/player-evaluation':evaluation,'@/lib/auth':{requireCoachAccess:async()=>{if(role==='guardian')throw Error('denied');return {supabase:metricsClient,user:{id:imageId},role}}}});
(async()=>{
 const png=await sharp({create:{width:10,height:12,channels:3,background:'#336699'}}).png().toBuffer();const out=await photo.preparePlayerPhoto(new File([png],'test.png',{type:'image/png'}));const meta=await sharp(out).metadata();assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);
 await assert.rejects(()=>photo.preparePlayerPhoto(new File(['<svg/>'],'bad.png',{type:'image/png'})));await assert.rejects(()=>photo.preparePlayerPhoto(new File([png],'bad.svg',{type:'image/svg+xml'})));await assert.rejects(()=>photo.preparePlayerPhoto(new File([Buffer.alloc(3*1024*1024+1)],'large.png',{type:'image/png'})));
 const get=()=>route.GET(new Request('https://example.test'),{params:Promise.resolve({id:imageId})});authorized=false;assert.equal((await get()).status,403);let form=new FormData();form.set('childId',childId);form.set('file',new File([png],'test.png',{type:'image/png'}));assert.ok((await upload.savePlayerPhoto(form)).error);assert.equal(uploadCalls,0);
 authorized=true;childVisible=false;assert.equal((await get()).status,404);assert.equal(serviceCalls,0);childVisible=true;mediaVisible=false;assert.equal((await get()).status,404);assert.equal(serviceCalls,0);mediaVisible=true;const res=await get();assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'private, no-store');
 const scores={pace:61,shooting:62,passing:63,dribbling:64,defending:65,physical:66,discipline:67};role='guardian';assert.equal((await metrics.updateStudentMetrics(childId,scores)).success,false);role='coach';childVisible=false;assert.equal((await metrics.updateStudentMetrics(childId,scores)).success,false);childVisible=true;assert.equal((await metrics.updateStudentMetrics(childId,{...scores,pace:100})).success,false);assert.equal((await metrics.updateStudentMetrics(childId,{...scores,pace:2.5})).success,false);assert.equal(scoreWrites.length,0);assert.equal((await metrics.updateStudentMetrics(childId,scores)).success,true);assert.equal(scoreWrites[0].visible_to_guardian,false);assert.equal(scoreWrites[0].evaluated_by,imageId);assert.equal((await metrics.updateStudentMetrics(childId,{...scores,visible_to_guardian:true})).success,true);assert.equal(scoreWrites[1].visible_to_guardian,true);
 console.log('PASS: actual image decode/format/size/metadata, private gallery authorization before service access, unauthorized avatar denied, assigned player and role checks, score validation, draft/publication defaults.');
})().catch(e=>{console.error(e);process.exitCode=1});
