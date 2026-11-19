const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
function load(file){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports,require);return m.exports}
const {academyQuote,firstMonthPercent,offerCampusPrice,offerTournamentQuote,campusProgramSchema,planSchema}=load('src/lib/offering.ts')
const plan={id:'fixture',name:'Academia',description:'',sessions_per_week:1,price:75,enrollment_fee:30,season_start:'2026-09-15',season_end:'2027-05-31',is_active:true,updated_at:''}
for(const [day,pct] of [[1,100],[7,100],[8,75],[15,75],[16,50],[22,50],[23,25],[30,25]]){
 const date=`2026-11-${String(day).padStart(2,'0')}`;assert.equal(firstMonthPercent(date),pct)
 const q=academyQuote(plan,date,true);assert.equal(q.first_month,75*pct/100);assert.equal(q.first_total,q.first_month+80)
 assert.equal(q.remaining.length,6);assert.deepEqual(q.remaining.at(-1),{month:'2027-05',amount:75,due_date:'2027-05-01'})
}
assert.equal(academyQuote(plan,'2027-05-31',false).remaining.length,0)
assert.equal(academyQuote({...plan,price:75.01},'2027-05-23',false).first_month,18.75)
assert.throws(()=>academyQuote(plan,'2027-06-01',false));assert.throws(()=>academyQuote(plan,'2026-09-14',false));assert.throws(()=>firstMonthPercent('2027-02-31'))
assert.equal(planSchema.safeParse({...plan,price:75.001}).success,false)
const campus={weeks:[{id:'1',label:'A',dates:['2026-12-22'],price:89},{id:'2',label:'B',dates:['2026-12-28'],price:99},{id:'3',label:'C',dates:['2027-01-04'],price:89}],pack_price:197,birth_from:2013,birth_to:2022,sibling_discount:5,daily_schedule:[['09:00','Llegada']],keeper_training:'09:15',keeper_games:'11:15'}
assert.equal(offerCampusPrice(['1','3'],campus),178);assert.equal(offerCampusPrice(['1','2','3'],campus),197)
assert.equal(offerCampusPrice(['1'],{...campus,weeks:campus.weeks.map(w=>({...w,price:110}))}),110)
assert.throws(()=>offerCampusPrice(['1','1'],campus));assert.throws(()=>offerCampusPrice(['4'],campus))
assert.equal(campusProgramSchema.safeParse({...campus,weeks:[campus.weeks[0],campus.weeks[0],campus.weeks[2]]}).success,false)
const tournament={events:[{id:'231'},{id:'champions'},{id:'costa-brava'}],prices:[70,130,180],kit_price:60}
assert.deepEqual(offerTournamentQuote(['231','champions'],false,tournament),{tournaments:130,kit:60,total:190,reviewCompatibility:true})
assert.equal(offerTournamentQuote(['champions'],false,tournament).kit,0);assert.throws(()=>offerTournamentQuote(['missing'],true,tournament))
console.log('PASS: all proration boundaries, cents, final month, invalid dates/prices, live campus/tournament prices, duplicate weeks and unavailable selections; no network or financial writes.')
