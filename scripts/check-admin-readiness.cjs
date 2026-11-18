// Explicit QA: temporary account only, no real family data or payment writes.
// Uses the existing Supabase CLI credential; never prints tokens or passwords.
const { execFileSync } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { createServerClient } = require('@supabase/ssr')
const assert = require('node:assert/strict')
const origin = 'https://www.academycostabrava.com'
const api = 'https://pnaitrnthhclyzfdvgbp.supabase.co'
let userId, key, client
async function sb(path, method='GET', body) {
 const r=await fetch(api+path,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
 if(!r.ok) throw Error(`QA database request failed (${r.status})`)
 const t=await r.text(); return t?JSON.parse(t):null
}
;(async()=>{
 let token=execFileSync('security',['find-generic-password','-s','Supabase CLI','-w'],{stdio:['ignore','pipe','ignore']}).toString().trim()
 if(token.startsWith('go-keyring-base64:')) token=Buffer.from(token.split(':')[1],'base64').toString()
 const r=await fetch('https://api.supabase.com/v1/projects/pnaitrnthhclyzfdvgbp/api-keys',{headers:{Authorization:`Bearer ${token}`}})
 if(!r.ok) throw Error('Management access unavailable')
 const keys=await r.json(); key=keys.find(k=>k.name==='service_role').api_key
 const email=`qa-readiness-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa9!'
 try {
  userId=(await sb('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{password_set:true}})).id
  await sb('/rest/v1/profiles?id=eq.'+userId,'PATCH',{role:'admin'})
  const jar=new Map()
  client=createServerClient(api,keys.find(k=>k.name==='anon').api_key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:rows=>rows.forEach(c=>jar.set(c.name,c.value))}})
  const login=await client.auth.signInWithPassword({email,password});assert.equal(login.error,null)
  const headers={Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}
  for(const path of ['/admin/dashboard','/admin/ajustes','/admin/academia','/admin/campus','/admin/campus/solicitudes','/admin/torneos/inscripciones','/admin/finanzas','/admin/actividades/correos']) {
   const page=await fetch(origin+path,{headers,redirect:'manual'}),html=await page.text()
   assert.equal(page.status,200,`${path} HTTP ${page.status}`)
   assert.ok(!html.includes('NEXT_REDIRECT')&&!html.includes('"digest":'),`${path} server error or redirect`)
   // Client-loaded admin screens are also tested via their actions/SQL suites.
   console.log(`PASS: authenticated admin route ${path}`)
  }
  await sb('/rest/v1/profiles?id=eq.'+userId,'PATCH',{role:'guardian'})
  for(const path of ['/admin/dashboard','/admin/finanzas','/admin/torneos/inscripciones']) {
   const page=await fetch(origin+path,{headers,redirect:'manual'}),html=await page.text()
   assert.ok([303,307,308].includes(page.status)||html.includes('NEXT_REDIRECT'),`Family accessed ${path}`)
   console.log(`PASS: family denied ${path}`)
  }
 } finally {
  if(client) await client.auth.signOut({scope:'global'})
  if(userId) await sb('/auth/v1/admin/users/'+userId,'DELETE')
  console.log('Temporary QA account deleted. No payments, memberships or messages created.')
 }
})().catch(e=>{console.error(e.message);process.exitCode=1})
