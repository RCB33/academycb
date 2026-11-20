const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(path,mocks={}){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>mocks[n]||require(n));return m.exports}
const lib=load('src/lib/player-profile.ts');const id='11111111-1111-4111-8111-111111111111';let role='guardian',visible=true,existingDate=null,writes=[];
const scoped={from:()=>{const q={select:()=>q,eq:()=>q,is:()=>q,maybeSingle:async()=>({data:visible?{id,birth_date:existingDate,birth_year:2016}:null,error:null})};return q}};
const action=load('src/app/actions/player-profile.ts',{
 '@/lib/player-profile':lib,'@/lib/player-evaluation':{madridToday:()=> '2026-11-20'},'next/cache':{revalidatePath:()=>{}},
 '@/lib/auth':{requireRole:async roles=>{if(!roles.includes(role))throw Error('denied');return{supabase:scoped}}},
 '@/lib/supabase/admin':{createAdminClient:()=>({from:()=>{const q={update:values=>{writes.push(values);return q},eq:()=>q,is:()=>q,select:()=>q,single:async()=>({data:{id},error:null})};return q}})},
});
(async()=>{
 const input={birth_date:'2016-01-15',club_name:'  Club QA  ',club_category:'S11',club_division:'Preferente'};
 assert.equal(lib.playerBirthLabel({birth_date:input.birth_date,birth_year:2016}),'enero de 2016');assert.equal(lib.playerBirthLabel({birth_date:null,birth_year:2016}),'2016');assert.equal(lib.playerBirthLabel({birth_date:'2016-02-31',birth_year:2016}),'2016');
 assert.deepEqual(lib.CLUB_CATEGORIES,['Escoleta','S7','S8','S9','S10','S11','S12','S13','S14','S15','S16']);assert.equal(lib.CLUB_DIVISIONS.length,4);
 for(const bad of [{...input,club_category:'S17'},{...input,club_division:'Inventada'},{...input,birth_date:'2016-02-30'},{...input,birth_date:'2099-01-01'},{...input,category_id:id},{...input,team_id:id},{...input,club_name:'X'.repeat(121)}])assert.equal((await action.updatePlayerProfile(id,bad)).success,false);
 visible=false;assert.equal((await action.updatePlayerProfile(id,input)).success,false);visible=true;role='coach';assert.equal((await action.updatePlayerProfile(id,input)).success,false);role='guardian';assert.equal(writes.length,0);
 assert.equal((await action.updatePlayerProfile(id,input)).success,true);assert.deepEqual(writes[0],{club_name:'Club QA',club_category:'S11',club_division:'Preferente',birth_date:'2016-01-15',birth_year:2016});
 assert.equal((await action.updatePlayerProfile(id,{...input,birth_date:''})).success,true);assert.ok(!Object.hasOwn(writes[1],'birth_year'));assert.ok(!Object.hasOwn(writes[1],'birth_date'));existingDate=input.birth_date;assert.equal((await action.updatePlayerProfile(id,{...input,birth_date:''})).success,false);role='admin';assert.equal((await action.updatePlayerProfile(id,input)).success,true);
 console.log('PASS: exact club options, date labels without invented month, invalid dates/values and mass assignment denied, foreign family/coach denied, own/admin update restricted fields, birth year synchronized, missing date preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
