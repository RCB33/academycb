// Read-only integration with the current public catalogue. Never prints credentials.
const fs=require('node:fs'),ts=require('typescript'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict')
const {createClient}=require('@supabase/supabase-js')
;(async()=>{
 let token=execFileSync('security',['find-generic-password','-s','Supabase CLI','-w'],{stdio:['ignore','pipe','ignore']}).toString().trim()
 if(token.startsWith('go-keyring-base64:'))token=Buffer.from(token.split(':')[1],'base64').toString()
 const response=await fetch('https://api.supabase.com/v1/projects/pnaitrnthhclyzfdvgbp/api-keys',{headers:{Authorization:`Bearer ${token}`}})
 if(!response.ok)throw Error('Management access unavailable')
 const keys=await response.json(),key=keys.find(k=>k.name==='service_role').api_key
 const db=createClient('https://pnaitrnthhclyzfdvgbp.supabase.co',key,{auth:{persistSession:false,autoRefreshToken:false}})
 const path=require('node:path'); const cache={};function load(file){if(cache[file])return cache[file];const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports,name=>name==='server-only'?{}:name==='@/lib/supabase/admin'?{createAdminClient:()=>db}:name.startsWith('@/')?load('src/'+name.slice(2)+'.ts'):name.startsWith('.')?load(path.join(path.dirname(file),name)+'.ts'):require(name));return cache[file]=m.exports}
 const {getAcademyOffer,getCampusOffers,getTournamentOffer,academySelection}=load('src/lib/offering-server.ts')
 const [a,c,t]=await Promise.all([getAcademyOffer(),getCampusOffers(),getTournamentOffer()])
 assert.equal(a.groups.length,12);assert.equal(a.plans.length,2);assert.equal(c.length,1);assert.equal(t.events.length,3)
 assert.equal(c[0].public_program.pack_price,197);assert.deepEqual(t.prices,[65,120,165])
 assert(!JSON.stringify(a).includes('coach_id'));assert(!JSON.stringify(t).includes('iban'))
 const input={plan_id:a.plans.find(p=>p.sessions_per_week===1).id,group_id:a.groups.find(g=>g.public_offer.kind==='field').id,start_date:'2027-01-16',plus:false,payment_choice:'transfer',offer_version:a.version}
 const selected=await academySelection(input,'2016-01-01');assert.equal(selected.quote.first_month,37.5)
 await assert.rejects(()=>academySelection({...input,offer_version:'stale'},'2016-01-01'),/cambiado/)
 console.log('PASS: public safe projections, 12 groups, 2 plans, campus programme, 3 tournaments, January proration, stale-offer rejection. Read-only.')
})().catch(e=>{console.error(e.message);process.exitCode=1})
