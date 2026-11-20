const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(path,mocks={}){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(m,m.exports,n=>mocks[n]||require(n));return m.exports}
const w=load('src/lib/coach-workspace.ts');
assert.equal(w.madridMidnight('2026-01-05'),'2026-01-04T23:00:00.000Z');
assert.equal(w.madridMidnight('2026-07-05'),'2026-07-04T22:00:00.000Z');
assert.equal(w.madridMidnight('2026-03-29'),'2026-03-28T23:00:00.000Z');
assert.equal(w.madridMidnight('2026-03-30'),'2026-03-29T22:00:00.000Z');
assert.equal(w.madridMidnight('2026-10-25'),'2026-10-24T22:00:00.000Z');
assert.equal(w.madridMidnight('2026-10-26'),'2026-10-25T23:00:00.000Z');
assert.equal(w.validDate('2026-02-31','fallback'),'fallback');assert.equal(w.shiftDate('2026-12-31',1),'2027-01-01');
assert.equal(w.sportArea({source_type:'campus',event_type:'training'}),'campus');
assert.equal(w.sportArea({source_type:'tournament',event_type:'match'}),'tournament');
assert.equal(w.sportArea({source_type:'manual',event_type:'meeting'}),'other');
let authorized=true,writes=[],dbError=null;
const mock={from:table=>({upsert:async data=>{writes.push({table,data});return {error:dbError}},insert:async data=>{writes.push({table,data});return {error:dbError}}})};
const a=load('src/app/actions/coach.ts',{'next/cache':{revalidatePath:()=>{}},'@/lib/auth':{requireCoachAccess:async()=>{if(!authorized)throw Error('denied');return {supabase:mock,user:{id:'coach'}}}}});
const id='00000000-0000-4000-8000-000000000001';
(async()=>{
 assert.equal((await a.setSessionPlayer('bad',id,true)).success,false);assert.equal(writes.length,0);
 authorized=false;assert.equal((await a.setSessionPlayer(id,id,true)).success,false);assert.equal(writes.length,0);
 authorized=true;assert.equal((await a.setSessionPlayer(id,id,true)).success,true);assert.equal(writes[0].table,'coach_session_roster');assert.equal(writes[0].data.updated_by,'coach');
 dbError={message:'Este jugador ya tiene asistencia registrada'};assert.match((await a.setSessionPlayer(id,id,false)).error,/historial/);dbError=null;
 assert.equal((await a.saveCoachObservation(id,'a')).success,false);assert.equal((await a.saveCoachObservation(id,'Buena progresión')).success,true);
 assert.equal(writes.at(-1).table,'coach_observations');assert.equal(writes.at(-1).data.author_id,'coach');
 assert.ok(writes.every(w=>!['payments','academy_memberships','campus_enrollments','tournament_players'].includes(w.table)));
 console.log('PASS: Madrid/DST boundaries, activity classification, dates, coach action auth/validation, safe roster and internal notes without enrollment/payment writes');
})().catch(e=>{console.error(e);process.exitCode=1});
