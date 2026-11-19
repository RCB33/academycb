const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(path) {
  const m = {exports:{}}
  new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports,name=>name.startsWith('.')?load('src/lib/'+name.slice(2)+'.ts'):require(name))
  return m.exports
}
const {previewFamilyPlan} = load('src/lib/family-plan.ts')
const plan = {id:'x',name:'Academia',price:75,enrollment_fee:30,duration_months:10,frequency:'mensual',updated_at:''}
const monthly=previewFamilyPlan(plan,'2026-09-01',1,5,true,50)
assert.equal(monthly.total,780)
assert.equal(monthly.endDate,'2027-06-30')
assert.equal(monthly.rows.length,10)
assert.equal(monthly.rows[9].covered_month,'2027-06')
assert.equal(monthly.rows[1].due_date,'2026-10-01')
const full=previewFamilyPlan({...plan,frequency:'temporada',price:650},'2026-09-01',28,10,false,0)
assert.equal(full.total,640)
assert.ok(full.rows.every(r=>r.due_date==='2026-09-28'))
assert.throws(()=>previewFamilyPlan({...plan,frequency:'trimestral'},'2026-09-01',5,0,false,0),/periodos completos/)
const quarter=previewFamilyPlan({...plan,duration_months:9,frequency:'trimestral',price:200},'2026-09-01',5,0,false,0)
assert.equal(quarter.total,600)
assert.deepEqual(quarter.rows.slice(0,3).map(r=>r.amount),[66.67,66.67,66.66])
assert.equal(quarter.rows[3].due_date,'2026-12-05')
assert.throws(()=>previewFamilyPlan(plan,'2026-13-01',1,0,false,0))
assert.throws(()=>previewFamilyPlan(plan,'2026-09-01',29,0,false,0))
assert.throws(()=>previewFamilyPlan(plan,'2026-09-01',1,76,false,0))
assert.equal(previewFamilyPlan(plan,'2026-09-01',1,75,false,0).total,0)
const season={...plan,duration_months:9,season_start:'2026-09-15',season_end:'2027-05-31'}
for(const [month,count] of [['2026-10',8],['2026-11',7],['2027-01',5],['2027-05',1]]) {
 const p=previewFamilyPlan(season,month+'-01',1,0,true,0)
 assert.equal(p.durationMonths,count)
 assert.equal(p.rows.length,count)
 assert.equal(p.endDate,'2027-05-31')
 assert.equal(p.total,count*75+30)
}
for(const month of ['2026-08','2026-09','2027-06']) assert.throws(()=>previewFamilyPlan(season,month+'-01',1,0,false,0),/temporada/)
assert.throws(()=>previewFamilyPlan({...season,season_end:'2027-05-15'},'2026-11-01',1,0,false,0),/último día/)
const action = fs.readFileSync('src/app/actions/family-plans.ts','utf8')
assert.ok(action.indexOf("legacy?.some") < action.indexOf("supabase.rpc('assign_family_plan_v2'"))
assert.ok(action.includes(".is('covered_month',null)"))
for(const day of [1,7,8,15,16,22,23,30]) {const date='2027-04-'+String(day).padStart(2,'0');const pct=day<=7?100:day<=15?75:day<=22?50:25;const v=previewFamilyPlan(season,date,1,5,true,50,'2026-11-19');assert.equal(v.rows[0].amount,Math.round(70*pct)/100);assert.equal(v.rows[0].due_date,date);assert.equal(v.rows[1].amount,70);assert.equal(v.endDate,'2027-05-31');assert.equal(v.firstTotal,v.rows[0].amount+80)}
const sept=previewFamilyPlan(season,'2026-09-15',1,0,false,0,'2026-09-01');assert.equal(sept.rows[0].amount,56.25);assert.equal(sept.rows.length,9);
console.log('PASS: family plan previews, monthly/quarterly/season, discounts, extras, cents, validation')
