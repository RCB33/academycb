// Opt-in integration smoke test against this project's protected TEST preview.
// Creates one temporary family, an unpublished plan, private contracts and one
// receipt. Opens then expires Stripe sessions; never supplies a payment method.
// Uses the existing Supabase CLI credential without printing any credential.
const {execFileSync}=require('node:child_process')
const {randomUUID}=require('node:crypto')
const {createServerClient}=require('@supabase/ssr')
const fs=require('node:fs')
const assert=require('node:assert/strict')
const api='https://pnaitrnthhclyzfdvgbp.supabase.co'
const deployment=process.argv[2]
if(!/^academycb-[a-z0-9-]+-roques-projects-bd4f7acb\.vercel\.app$/.test(deployment||''))throw Error('Pass an Academy preview deployment, never production')
const origin='https://'+deployment
const ids={user:null,guardian:randomUUID(),child:randomUUID(),plan:randomUUID(),membership:randomUUID(),contract:randomUUID(),receipt:randomUUID()}
let key,access,cookie='',stage='credentials',keepFixtures=false
async function sb(path,method='GET',body){
 const response=await fetch(api+path,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
 if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(`Database operation failed (${response.status}, ${error.code || 'unknown'}): ${error.message || 'request rejected'}`)}
 const text=await response.text();return text?JSON.parse(text):null
}
const refs=JSON.parse(fs.readFileSync('.next/server/server-reference-manifest.json','utf8')).node
const deployedRefs={}
function previewGet(path){return execFileSync('npx',['vercel@59.13.1','curl',path,'--deployment',deployment,'--','--silent','--header','Cookie: '+cookie],{encoding:'utf8',maxBuffer:8e6,timeout:45000,stdio:['ignore','pipe','pipe']})}
async function loadDeployedActions(){
 const html=previewGet('/portal/pagos')
 if(!html.includes('QA TEMPORAL'))throw Error('No action result: temporary family page did not render')
 const chunks=[...new Set([...html.matchAll(/src="([^" ]+\.js[^" ]*)"/g)].map(m=>m[1]))].filter(s=>s.startsWith('/_next/'))
 for(const path of chunks){
  const source=previewGet(path)
  for(const match of source.matchAll(/"([0-9a-f]{40,})"[^;\n]{0,220}?"(payReceipt|payAcademy|cancelCheckout)"/g))deployedRefs[match[2]]=match[1]
  if(Object.keys(deployedRefs).length===3)break
 }
 if(Object.keys(deployedRefs).length!==3)throw Error('No action result: deployed action references not found')
 console.log('Authenticated family page and deployed button references verified.')
}
async function action(name,args){
 const id=deployedRefs[name]||Object.keys(refs).find(id=>refs[id].filename==='src/app/portal/(authenticated)/pagos/actions.ts'&&refs[id].exportedName===name)
 if(!id)throw Error('Build action missing')
 const result=execFileSync('npx',['vercel@59.13.1','curl','/portal/pagos','--deployment',deployment,'--','--silent','--request','POST','--header','Cookie: '+cookie,'--header','Origin: '+origin,'--header','Next-Action: '+id,'--header','Content-Type: text/plain;charset=UTF-8','--data',JSON.stringify(args)],{encoding:'utf8',maxBuffer:5e6,timeout:45000,stdio:['ignore','pipe','pipe']})
 for(const line of result.split('\n')){
  const match=line.match(/^[0-9a-f]+:(\{.*\})$/);if(!match)continue
  try{const parsed=JSON.parse(match[1]);if(parsed.url||parsed.error||parsed.success)return parsed}catch{}
 }
 throw Error('No action result; preview build or authentication mismatch')
}
;(async()=>{
 let token=execFileSync('security',['find-generic-password','-s','Supabase CLI','-w'],{stdio:['ignore','pipe','ignore']}).toString().trim()
 if(token.startsWith('go-keyring-base64:'))token=Buffer.from(token.split(':')[1],'base64').toString()
 const response=await fetch('https://api.supabase.com/v1/projects/pnaitrnthhclyzfdvgbp/api-keys',{headers:{Authorization:`Bearer ${token}`}})
 const keys=await response.json();key=keys.find(k=>k.name==='service_role').api_key;const anon=keys.find(k=>k.name==='anon').api_key
 const email=`qa-checkout-${Date.now()}@example.com`,password=randomUUID()+'Aa9!'
 try{
  stage='private fixtures'
  ids.user=(await sb('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{password_set:true}})).id
  await sb('/rest/v1/guardians','POST',{id:ids.guardian,user_id:ids.user,full_name:'QA TEMPORAL — Pagos',phone:'000000000',email})
  await sb('/rest/v1/children','POST',{id:ids.child,full_name:'QA TEMPORAL — Pagos',birth_year:2015,archived_at:new Date().toISOString(),notes:'Temporary isolated integration test; no real player'})
  await sb('/rest/v1/child_guardians','POST',{child_id:ids.child,guardian_id:ids.guardian})
  await sb('/rest/v1/membership_plans','POST',{id:ids.plan,name:'QA TEMPORAL — No publicar',duration_months:3,price:0,is_active:false})
  await sb('/rest/v1/academy_memberships','POST',{id:ids.membership,child_id:ids.child,plan_id:ids.plan,status:'active',start_date:'2026-09-14',end_date:'2026-12-14'})
  await sb('/rest/v1/payments','POST',{id:ids.receipt,type:'other',child_id:ids.child,amount:1,status:'pending',description:'QA TEMPORAL — Checkout TEST'})
  const jar=new Map()
  const client=createServerClient(api,anon,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:rows=>rows.forEach(v=>jar.set(v.name,v.value))}})
  const login=await client.auth.signInWithPassword({email,password});if(login.error)throw Error('Temporary login failed')
  access=login.data.session.access_token;cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
  stage='deployed button references';await loadDeployedActions()
  stage='receipt Checkout'
  const receipt=await action('payReceipt',[ids.receipt]);assert.ok(receipt.url?.startsWith('https://checkout.stripe.com/'),receipt.error)
  const attempts=await sb('/rest/v1/receipt_checkout_attempts?payment_id=eq.'+ids.receipt)
  assert.equal(attempts[0].mode,'test');assert.equal(attempts[0].state,'open');assert.equal(attempts[0].amount_cents,100)
  keepFixtures=true
  const twice=await action('payReceipt',[ids.receipt]);assert.equal(twice.url,receipt.url)
  const cancelled=await action('cancelCheckout',['receipt',attempts[0].id]);assert.equal(cancelled.success,true,cancelled.error)
  keepFixtures=false
  console.log('PASS: real TEST receipt session, exact amount, double-click reuse, Stripe expiration.')
  for(const choice of ['full','monthly']){
   stage=choice+' Checkout'
   await sb('/rest/v1/academy_checkout_contracts','POST',{id:ids.contract,membership_id:ids.membership,owner_id:ids.user,mode:'test',choice,plan_name:'QA TEMPORAL — TEST',unit_cents:100,fee_cents:100,months:3,total_cents:choice==='full'?200:400,return_origin:origin})
   const result=await action('payAcademy',[ids.membership,choice,true,{unitCents:100,feeCents:100,months:3}]);assert.ok(result.url?.startsWith('https://checkout.stripe.com/'),result.error)
   keepFixtures=true
   const contracts=await sb('/rest/v1/academy_checkout_contracts?id=eq.'+ids.contract);assert.equal(contracts[0].state,'open');assert.equal(contracts[0].mode,'test')
   const cancelled=await action('cancelCheckout',['academy',ids.contract]);assert.equal(cancelled.success,true,cancelled.error)
   keepFixtures=false
   await sb('/rest/v1/academy_checkout_contracts?id=eq.'+ids.contract,'DELETE')
   ids.contract=randomUUID()
   console.log(`PASS: real TEST ${choice} Checkout creation and expiration. No card or charge.`)
  }
  const receiptRow=await sb('/rest/v1/payments?id=eq.'+ids.receipt);assert.equal(receiptRow[0].status,'pending')
  console.log('PASS: real accounting unchanged. This does NOT validate a paid invoice or a complete recurring cycle.')
 }finally{
  const cleanupStage=stage
  // A failed bind can still leave a Stripe session open. Never erase its audit
  // trail just because the HTTP action failed.
  const existingAttempts=await sb('/rest/v1/receipt_checkout_attempts?payment_id=eq.'+ids.receipt)
  const existingContracts=await sb('/rest/v1/academy_checkout_contracts?membership_id=eq.'+ids.membership)
  if([...(existingAttempts||[]),...(existingContracts||[])].some(a=>['creating','open','active','completed','paid'].includes(a.state)))keepFixtures=true
  if(keepFixtures){console.error('A TEST session could not be expired. Retaining its private records for reconciliation; no real charges.');console.log('Temporary owner ID:',ids.user);process.exitCode=1;return}
  const attempts=await sb('/rest/v1/receipt_checkout_attempts?payment_id=eq.'+ids.receipt)
  for(const a of attempts||[])await sb('/rest/v1/receipt_checkout_events?attempt_id=eq.'+a.id,'DELETE')
  await sb('/rest/v1/receipt_checkout_attempts?payment_id=eq.'+ids.receipt,'DELETE')
  await sb('/rest/v1/academy_checkout_contracts?membership_id=eq.'+ids.membership,'DELETE')
  await sb('/rest/v1/academy_memberships?id=eq.'+ids.membership,'DELETE')
  await sb('/rest/v1/payments?child_id=eq.'+ids.child,'DELETE')
  await sb('/rest/v1/child_guardians?child_id=eq.'+ids.child,'DELETE')
  await sb('/rest/v1/children?id=eq.'+ids.child,'DELETE')
  await sb('/rest/v1/guardians?id=eq.'+ids.guardian,'DELETE')
  await sb('/rest/v1/membership_plans?id=eq.'+ids.plan,'DELETE')
  if(access)await fetch(api+'/auth/v1/logout?scope=global',{method:'POST',headers:{apikey:key,Authorization:`Bearer ${access}`}})
  if(ids.user)await sb('/auth/v1/admin/users/'+ids.user,'DELETE')
  console.log('Temporary family, unpublished plan, receipts and private contracts removed.')
  stage=cleanupStage
 }
})().catch(error=>{const safe=error.message?.startsWith('Database operation')||error.message?.startsWith('No action result')||error.code==='ERR_ASSERTION';console.error(`FAIL at ${stage}: ${safe?error.message.split('\n')[0]:'integration request failed; secrets omitted'}`);process.exitCode=1})
