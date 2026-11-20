const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(path,mocks={}){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(m,m.exports,n=>n==='server-only'?{}:mocks[n]||require(n));return m.exports}
const media=load('src/lib/family-media.ts'), attendance=load('src/lib/attendance-summary.ts');
const child='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
let authorized=true,service=0,existing=null,inserted=[],removed=[],info={size:16,contentType:'video/mp4'},bytes=Buffer.from([0,0,0,16,102,116,121,112,105,115,111,109,0,0,0,0]);
let selectedAsset={video_url:`storage:child/${child}/${user}/${id}.mp4`};
const admin={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:existing,error:null})})}),insert:async v=>{inserted.push(v);return {error:null}}}),storage:{from:()=>({createSignedUploadUrl:async path=>({data:{path,token:'test'},error:null}),info:async()=>({data:info,error:null}),download:async()=>({data:new Blob([bytes]),error:null}),remove:async paths=>{removed.push(...paths);return {error:null}},createSignedUrl:async()=>({data:{signedUrl:'https://example.invalid/private-video'},error:null})})}};
const scoped={from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:selectedAsset,error:null})};return q}};
const access=async()=>{if(!authorized)throw Error('denied');return {user:{id:user},supabase:scoped,role:'guardian'}};
const mocks={'next/cache':{revalidatePath:()=>{}},'@/lib/player-photo-access':{requirePlayerPhotoAccess:access},'@/lib/family-context':{getFamilyContext:()=>null},'@/lib/supabase/server':{createClient:()=>scoped},'@/lib/supabase/admin':{createAdminClient:()=>{service++;return admin}},'@/lib/admin-read-all':{},'@/lib/family-media':media};
const actions=load('src/app/actions/family-media.ts',mocks), route=load('src/app/api/family-video/[id]/route.ts',{'@/lib/auth':{requireRole:access},'@/lib/supabase/admin':mocks['@/lib/supabase/admin']});
(async()=>{
 assert.deepEqual(attendance.attendanceSummary([],'2026-11-20'),{total:0,present:0,absent:0,excused:0,percentage:null});
 assert.equal(attendance.attendanceSummary([{attendance:'present',session_date:'2026-11-10'},{attendance:'absent',session_date:'2026-11-11'},{attendance:'excused',session_date:'2026-11-12'},{attendance:'present',session_date:'2026-12-01'}],'2026-11-20').percentage,33);
 assert.equal(media.videoFileIsValid(bytes,'video/mp4'),true);assert.equal(media.videoFileIsValid(Buffer.from('<html>wrong</html>'),'video/mp4'),false);assert.equal(media.youtubeEmbed('https://youtube.com.evil.test/watch?v=abcdefghijk'),null);assert.equal(media.youtubeEmbed('https://youtu.be/abcdefghijk'),'https://www.youtube-nocookie.com/embed/abcdefghijk');
 authorized=false;assert.ok((await actions.prepareFamilyVideo({childId:child,mime:'video/mp4',size:16})).error);assert.equal(service,0);
 authorized=true;assert.ok((await actions.prepareFamilyVideo({childId:child,mime:'video/mp4',size:media.FAMILY_VIDEO_LIMIT+1})).error);assert.equal(service,0);
 assert.match((await actions.prepareFamilyVideo({childId:child,mime:'video/mp4',size:16})).path,new RegExp(`^child/${child}/${user}/`));
 const input={childId:child,path:`child/${child}/${user}/${id}.mp4`,title:'QA video'};
 assert.ok((await actions.finishFamilyVideo({...input,path:input.path.replace(user,child)})).error);assert.equal(inserted.length,0);
 info.size=media.FAMILY_VIDEO_LIMIT+1;assert.ok((await actions.finishFamilyVideo(input)).error);assert.equal(inserted.length,0);assert.equal(removed.length,1);info.size=16;
 bytes=Buffer.from('<html>wrong</html>');assert.ok((await actions.finishFamilyVideo(input)).error);assert.equal(inserted.length,0);
 bytes=Buffer.from([0,0,0,16,102,116,121,112,105,115,111,109,0,0,0,0]);assert.equal((await actions.finishFamilyVideo(input)).success,true);assert.equal(inserted[0].child_id,child);assert.equal(inserted[0].category_id,undefined);assert.equal(inserted[0].created_by,user);
 existing={id,child_id:child,created_by:user,video_url:`storage:${input.path}`};assert.equal((await actions.finishFamilyVideo(input)).success,true);assert.equal(inserted.length,1);
 const get=()=>route.GET(new Request('https://example.invalid'),{params:Promise.resolve({id})});authorized=false;assert.equal((await get()).status,403);authorized=true;selectedAsset=null;let calls=service;assert.equal((await get()).status,404);assert.equal(service,calls);selectedAsset={video_url:`storage:${input.path}`};const response=await get();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 console.log('PASS: attendance empty/future/absent/excused; video header, size, ownership, atomic ID/retry, private scoped media route, YouTube host allowlist.');
})().catch(e=>{console.error(e);process.exitCode=1});
