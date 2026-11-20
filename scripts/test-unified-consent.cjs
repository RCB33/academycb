const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(path,mocks={}){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(m,m.exports,n=>mocks[n]||require(n));return m.exports}
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
let owned=true,signed=true,rows=[],uploads=0,removes=0,fail=false;
const db={from(table){const q={select:()=>q,eq:()=>q,limit:()=>q,single:async()=>({data:owned?{id:ids[0]}:null}),maybeSingle:async()=>({data:table==='guardians'?(owned?{id:ids[0]}:null):signed?{id:ids[0]}:null}),then:resolve=>resolve({data:ids.slice(1).map(child_id=>({child_id})),error:null}),insert:async r=>{if(fail)return {error:{message:'simulated failure'}};rows.push(r);return {error:null}}};return q},storage:{from:()=>({upload:async()=>{uploads++;return {error:null}},remove:async()=>{removes++;return {error:null}}})}};
const a=load('src/app/actions/signatures.ts',{'@/lib/supabase/server':{createClient:async()=>db},'next/cache':{revalidatePath:()=>{}},'next/headers':{headers:async()=>new Headers()},'@/lib/auth':{requireUser:async()=>({supabase:db,user:{id:ids[0]}}),requireAdmin:async()=>({supabase:db})},'@/lib/image-consent':load('src/lib/image-consent.ts')});
const normalize=load('src/lib/image-consent.ts').imageConsentOptions;assert.deepEqual(normalize({portal_internal:'true'}),{portal_internal:false,public_communications:false});
const no={portal_internal:false,public_communications:false},yes={portal_internal:true,public_communications:false};
const input={guardianId:ids[0],documentType:'Condiciones Generales Academia',documentVersion:'2026.11',signatureBase64:'data:image/png;base64,iVBORw0KGgo=',playerConsents:[{childId:ids[1],options:yes},{childId:ids[2],options:no}],confirmed:true};
(async()=>{
 assert.equal((await a.createSignature({...input,confirmed:false})).success,false);assert.equal(uploads,0);
 owned=false;assert.equal((await a.createSignature(input)).success,false);owned=true;
 assert.equal((await a.createSignature({...input,playerConsents:[{childId:ids[0],options:yes}]})).success,false);assert.equal(uploads,0);
 assert.equal((await a.createSignature({...input,playerConsents:[input.playerConsents[0],input.playerConsents[0]]})).success,false);
 assert.equal((await a.createSignature(input)).success,true);assert.equal(uploads,1);assert.equal(rows.length,1);assert.equal(rows[0].length,3);assert.equal(new Set(rows[0].map(r=>r.signature_image_path)).size,1);assert.deepEqual(rows[0][2].consent_options,no);assert.equal(rows[0][1].consent_options.public_communications,false);
 const prefs={guardianId:ids[0],choices:[{childId:ids[1],options:no}],confirmed:true};
 signed=false;assert.equal((await a.saveImageConsentChoices(prefs)).success,false);signed=true;
 assert.equal((await a.saveImageConsentChoices({...prefs,confirmed:false})).success,false);
 assert.equal((await a.saveImageConsentChoices({...prefs,choices:[{childId:ids[0],options:yes}]})).success,false);
 assert.equal((await a.saveImageConsentChoices(prefs)).success,true);assert.equal(uploads,1);assert.equal(rows[1][0].signature_image_path,null);assert.equal(JSON.parse(rows[1][0].signature_data).method,'authenticated_choice');assert.deepEqual(rows[0][1].consent_options,yes,'Original signed choice unchanged');
 fail=true;assert.equal((await a.createSignature(input)).success,false);assert.equal(removes,1);assert.equal(rows.length,2);
 console.log('PASS: one upload/atomic batch for general + per-child choices, refusals preserved, explicit confirmation, ownership, duplicate/foreign child rejection, no second drawn signature, append-only updates and upload cleanup. No network.');
})().catch(e=>{console.error(e);process.exitCode=1});
