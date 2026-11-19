// Opt-in connected QA. Temporary records only; never pays a LIVE Checkout.
// Preview additionally opens/expires TEST sessions and tests provider clocks.
const {execFileSync}=require('node:child_process')
const {randomUUID,createHash}=require('node:crypto')
const {createServerClient}=require('@supabase/ssr')
const assert=require('node:assert/strict')
const host=process.argv[2],preview=/^academycb-[a-z0-9-]+-roques-projects-bd4f7acb\.vercel\.app$/.test(host||'')
if(!preview&&host!=='www.academycostabrava.com')throw Error('Use the Academy host explicitly')
const origin='https://'+host,api='https://pnaitrnthhclyzfdvgbp.supabase.co'
const ids={child:randomUUID(),guardian:randomUUID(),receipts:[randomUUID(),randomUUID()],requests:[]},users=[],clients=[]
let key,stage='credentials',baseline,clock,clockRun=randomUUID(),adminCookie=''
async function sb(path,method='GET',body){const r=await fetch(api+path,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error(`QA database HTTP ${r.status}: ${(await r.json()).code}`);const t=await r.text();return t?JSON.parse(t):null}
async function fingerprint(){return createHash('sha256').update(JSON.stringify((await sb('/rest/v1/payments?select=*&order=id')).filter(p=>!ids.receipts.includes(p.id)))).digest('hex')}
async function request(path,cookie,body,extra={}) {
 if(preview){const args=['/Users/roque/.npm/_npx/ce54f19f4dbd7608/node_modules/vercel/dist/index.js','curl',path,'--deployment',host,'--','--silent','--write-out','\n%{http_code}','--header','Cookie: '+cookie];if(body)args.push('--request','POST','--header','Content-Type: application/json','--header','Origin: '+(extra.origin||origin),'--data',JSON.stringify(body));const raw=execFileSync('node',args,{encoding:'utf8',timeout:90000,maxBuffer:4e6,stdio:['ignore','pipe','pipe']});const pos=raw.lastIndexOf('\n'),text=raw.slice(0,pos);let data;try{data=JSON.parse(text)}catch{data=text}return{status:Number(raw.slice(pos+1)),data}}
 const r=await fetch(origin+path,{method:body?'POST':'GET',redirect:'manual',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json',Origin:extra.origin||origin}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return{status:r.status,data}
}
async function probe(body){const r=await request('/api/admin/stripe/billing-test',adminCookie,{...body,id:clockRun,clockId:clock});if(r.data?.clockId)clock=r.data.clockId;if(r.status!==200)throw Error('Provider TEST: '+JSON.stringify(r.data));return r.data}
async function clockAdvance(timestamp){await probe({action:'advance',timestamp:Date.parse(timestamp)/1000});for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,1500));const result=await probe({action:'status'});if(result.status==='ready')return result}throw Error('Test clock still advancing')}
;(async()=>{
 let token=execFileSync('security',['find-generic-password','-s','Supabase CLI','-w'],{stdio:['ignore','pipe','ignore']}).toString().trim();if(token.startsWith('go-keyring-base64:'))token=Buffer.from(token.split(':')[1],'base64').toString()
 const kr=await fetch('https://api.supabase.com/v1/projects/pnaitrnthhclyzfdvgbp/api-keys',{headers:{Authorization:`Bearer ${token}`}});const keys=await kr.json();key=keys.find(k=>k.name==='service_role').api_key
 baseline=await fingerprint()
 try{
  stage='temporary users'
  const cookies=[]
  for(const role of ['admin','guardian','guardian']){const email=`qa-billing-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa9!',u=await sb('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{password_set:true}});users.push(u.id);await sb('/rest/v1/profiles?id=eq.'+u.id,'PATCH',{role});const jar=new Map(),client=createServerClient(api,keys.find(k=>k.name==='anon').api_key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:rows=>rows.forEach(c=>jar.set(c.name,c.value))}});clients.push(client);const login=await client.auth.signInWithPassword({email,password});assert.equal(login.error,null);cookies.push([...jar].map(([k,v])=>`${k}=${v}`).join('; '))}
  const [admin,parent,stranger]=cookies;adminCookie=admin
  if(process.argv.includes('--clock-only')){
   assert.ok(preview,'Provider clock only in Preview');stage='provider Test Clock'
   console.log('Starting isolated Stripe TEST lifecycle; no Academy receipts.')
   await probe({action:'start'})
   await clockAdvance('2027-01-05T12:00:00Z');let result=await clockAdvance('2027-01-05T14:00:00Z')
   let success=result.customers.find(c=>c.name.endsWith('success')),failure=result.customers.find(c=>c.name.endsWith('failure'))
   assert.equal(success.invoices.filter(i=>i.status==='paid'&&i.paid===100).length,1);assert.ok(failure.invoices.some(i=>i.status==='open'&&i.attempted&&i.paid===0));console.log('PASS provider: first TEST invoice paid; declined TEST card remains unpaid.')
   await clockAdvance('2027-02-05T12:00:00Z');result=await clockAdvance('2027-02-05T14:00:00Z');success=result.customers.find(c=>c.name.endsWith('success'));assert.equal(success.invoices.filter(i=>i.status==='paid'&&i.paid===100).length,2);console.log('PASS provider: second monthly invoice, exact amount.')
   result=await clockAdvance('2027-03-05T14:00:00Z');success=result.customers.find(c=>c.name.endsWith('success'));assert.equal(success.invoices.filter(i=>i.status==='paid').length,2);assert.ok(success.subscriptions.every(s=>s.status==='canceled'));console.log('PASS provider: schedule ended automatically; no third charge. This is not a LIVE charge or full Checkout/browser test.')
   return
  }
  stage='temporary receipts'
  await sb('/rest/v1/children','POST',{id:ids.child,full_name:'QA TEMPORAL — Enlaces',birth_year:2015,archived_at:new Date().toISOString()})
  await sb('/rest/v1/guardians','POST',{id:ids.guardian,user_id:users[1],full_name:'QA TEMPORAL — Tutor enlaces',email:'delivered@resend.dev',phone:'000000000'})
  await sb('/rest/v1/child_guardians','POST',{child_id:ids.child,guardian_id:ids.guardian})
  const dates=[1,2].map(n=>{const d=new Date();return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,5)).toISOString().slice(0,10)})
  for(let i=0;i<2;i++)await sb('/rest/v1/payments','POST',{id:ids.receipts[i],child_id:ids.child,type:'other',amount:1,status:'pending',due_date:dates[i],covered_month:dates[i].slice(0,7),concept_code:'monthly',description:'QA TEST — mensualidad'})
  stage='admin permissions'
  assert.equal((await request('/api/admin/billing','')).status,403);assert.equal((await request('/api/admin/billing',parent)).status,403)
  const page=await request('/admin/finanzas/solicitudes',admin);assert.equal(page.status,200);assert.ok(page.data.includes('Cobros y suscripciones por enlace'))
  const workspace=await request('/api/admin/billing?child_id='+ids.child,admin);assert.equal(workspace.status,200,JSON.stringify(workspace.data));assert.equal(workspace.data.receipts.length,2);assert.ok(workspace.data.guardians.some(g=>g.id===ids.guardian));console.log('Payment configuration:',JSON.stringify({cardEnabled:workspace.data.cardEnabled,recurringEnabled:workspace.data.recurringEnabled,emailConfigured:workspace.data.emailConfigured}))
  assert.equal((await request('/api/admin/billing',admin,{action:'cancel',id:randomUUID()},{origin:'https://invalid.example'})).status,403)
  console.log('PASS: authenticated admin page; anonymous, family and foreign-origin requests denied.')
  for(const kind of ['payment','subscription']){
   stage=kind+' request';const id=randomUUID();ids.requests.push(id)
   const body={action:'create',id,childId:ids.child,guardianId:ids.guardian,kind,title:'QA TEST — '+kind,paymentIds:ids.receipts}
   const created=await request('/api/admin/billing',admin,body);assert.equal(created.status,200,JSON.stringify(created.data));assert.equal((await request('/api/admin/billing',admin,body)).data.id,id)
   const listed=await request('/api/admin/billing?child_id='+ids.child,admin);assert.equal(listed.status,200);assert.ok(listed.data.requests.some(r=>r.id===id))
   const family=await request('/portal/pagos/solicitud/'+id,parent);assert.equal(family.status,200);assert.ok(family.data.includes('QA TEST'))
   const other=await request('/portal/pagos/solicitud/'+id,stranger);assert.ok(other.status===404||typeof other.data==='string'&&other.data.includes('NEXT_HTTP_ERROR_FALLBACK;404'))
   assert.equal((await request('/api/billing/'+id+'/checkout',stranger,{accepted:true,totalCents:200})).status,404)
   if(preview){
    if(kind==='payment'){
     const mail=await request('/api/admin/billing',admin,{action:'email',id});assert.equal(mail.status,200,JSON.stringify(mail.data));assert.equal((await sb('/rest/v1/billing_requests?id=eq.'+id))[0].email_status,'accepted');assert.equal((await request('/api/admin/billing',admin,{action:'email',id})).status,200);console.log('PASS: Resend accepted one email to its official test mailbox; repeated send is idempotent. Human mailbox delivery not tested.')
    }
    const wrong=await request('/api/billing/'+id+'/checkout',parent,{accepted:true,totalCents:1});assert.equal(wrong.status,409)
    const checkout=await request('/api/billing/'+id+'/checkout',parent,{accepted:true,totalCents:200});assert.equal(checkout.status,200,JSON.stringify(checkout.data));assert.ok(checkout.data.url.startsWith('https://checkout.stripe.com/'))
    assert.equal((await request('/api/billing/'+id+'/checkout',parent,{accepted:true,totalCents:200})).data.url,checkout.data.url)
   }
   const cancelled=await request('/api/admin/billing',admin,{action:'cancel',id});assert.equal(cancelled.status,200,JSON.stringify(cancelled.data));assert.equal((await sb('/rest/v1/billing_requests?id=eq.'+id))[0].state,'cancelled')
   console.log(`PASS: ${kind} request, duplicate prevention, parent-only access and cancellation${preview?', TEST Checkout created/reused/expired without a card':''}.`)
  }
  assert.ok((await sb('/rest/v1/payments?child_id=eq.'+ids.child)).every(p=>p.status==='pending'))
 }finally{
  if(clock){await probe({action:'cleanup'});console.log('Isolated Stripe TEST clock and customers deleted; test price archived.')}
  // Retain audit trail if a provider attempt remains open; never silently erase it.
  let active=[];for(const id of ids.requests)active.push(...await sb('/rest/v1/billing_request_attempts?request_id=eq.'+id+'&state=not.in.(expired,cancelled)'))
  if(active.length){console.error('QA retained: reconcile TEST attempts before deleting fixtures. No real receipts changed.');process.exitCode=1}
  else{
   for(const id of ids.requests){await sb('/rest/v1/billing_request_attempts?request_id=eq.'+id,'DELETE');await sb('/rest/v1/billing_request_items?request_id=eq.'+id,'DELETE');await sb('/rest/v1/billing_requests?id=eq.'+id,'DELETE')}
   await sb('/rest/v1/payments?child_id=eq.'+ids.child,'DELETE');await sb('/rest/v1/child_guardians?child_id=eq.'+ids.child,'DELETE');await sb('/rest/v1/children?id=eq.'+ids.child,'DELETE');await sb('/rest/v1/guardians?id=eq.'+ids.guardian,'DELETE')
   for(const client of clients)await client.auth.signOut({scope:'global'});for(const id of users)await sb('/auth/v1/admin/users/'+id,'DELETE')
   console.log('Temporary accounts and fixtures removed; sessions revoked.')
  }
  assert.equal(await fingerprint(),baseline,'Existing payment rows changed');console.log('PASS: existing payments byte-for-byte unchanged.')
 }
})().catch(e=>{console.error(`FAIL at ${stage}: ${e.message}`);process.exitCode=1})
