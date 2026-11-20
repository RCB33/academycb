const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(path,mocks={}){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(m,m.exports,n=>mocks[n]||require(n));return m.exports}
const evaluation=load('src/lib/player-evaluation.ts');
const scores={pace:70,shooting:65,passing:75,dribbling:72,defending:60,physical:68,discipline:85};
assert.equal(evaluation.evaluationSchema.safeParse({...scores,notes:'Good effort'}).success,true);
assert.equal(evaluation.evaluationSchema.safeParse({...scores,notes:'x'.repeat(2001)}).success,false);
assert.equal(evaluation.evaluationSchema.safeParse({...scores,pace:99.5}).success,false);
assert.equal(evaluation.evaluationSchema.safeParse({...scores,evaluated_by:'spoof'}).success,false);
let authorized=true,active=true,writes=[],error=null;
const supabase={from:table=>({select:()=>({eq:()=>({is:()=>({maybeSingle:async()=>({data:active?{id:'child'}:null,error:null})})})}),insert:async data=>{writes.push({table,data});return {error}}})};
const actions=load('src/app/actions/coach-achievements.ts',{'next/cache':{revalidatePath:()=>{}},'@/lib/player-evaluation':evaluation,'@/lib/auth':{requireCoachAccess:async()=>{if(!authorized)throw Error('denied');return {supabase}}}});
const id='00000000-0000-4000-8000-000000000001';
(async()=>{
 assert.equal((await actions.awardCoachAchievement('bad',id,'')).success,false);
 authorized=false;assert.equal((await actions.awardCoachAchievement(id,id,'')).success,false);
 authorized=true;active=false;assert.equal((await actions.awardCoachAchievement(id,id,'')).success,false);
 active=true;assert.equal((await actions.awardCoachAchievement(id,id,'x'.repeat(1001))).success,false);assert.equal(writes.length,0);
 assert.equal((await actions.awardCoachAchievement(id,id,'  Great effort  ')).success,true);
 assert.deepEqual(writes[0],{table:'child_achievements',data:{child_id:id,achievement_id:id,note:'Great effort',earned_at:evaluation.madridToday()}});
 error={code:'23505'};assert.match((await actions.awardCoachAchievement(id,id,'Again')).error,/ya tiene/);
 assert.ok(writes.every(w=>w.table==='child_achievements'));
 console.log('PASS: evaluation notes/scores validation, trophy auth, active-player checks, dedication limits, duplicate response, no payment writes');
})().catch(e=>{console.error(e);process.exitCode=1});
