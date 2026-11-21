const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const id='11111111-1111-4111-8111-111111111111'
let authorized=true,saveError=false,visible=true,record,updates,paths
function reset(){record={id,full_name:'Tutor original',email:'old@example.invalid',phone:'600000000',notes:'Notas privadas existentes',user_id:'existing-user'};updates=[];paths=[];authorized=true;saveError=false;visible=true}
const db={from(table){assert.equal(table,'guardians');let values;const q={update(v){values=v;return q},eq(key,value){assert.equal(key,'id');assert.equal(value,id);return q},select(columns){assert.equal(columns,'id');return q},async maybeSingle(){if(saveError)return {data:null,error:{message:'mock error'}};if(!visible)return {data:null,error:null};updates.push(values);Object.assign(record,values);return {data:{id},error:null}}};return q}}
const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync('src/app/actions/guardians.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,name=>{
 if(name==='@/lib/auth')return {requireAdmin:async()=>{if(!authorized)throw Error('Not authorized');return {supabase:db}}}
 if(name==='next/cache')return {revalidatePath:(...args)=>paths.push(args)}
 if(name==='@/lib/auth/access-activation')return {}
 if(name==='@/lib/supabase/admin')return {createAdminClient:()=>{throw Error('Contact edits must not change Auth or send messages')}}
 return require(name)
})
global.fetch=()=>{throw Error('Network forbidden')}
;(async()=>{
 const save=m.exports.updateGuardian
 const data={full_name:'  Tutor actualizado  ',email:'CONTACT@EXAMPLE.INVALID',phone:'  611111111  ',notes:'Do not replace hidden notes',user_id:'attacker'}
 reset();assert.equal((await save(id,data)).success,true)
 assert.deepEqual(updates,[{full_name:'Tutor actualizado',email:'contact@example.invalid',phone:'611111111'}])
 assert.equal(record.notes,'Notas privadas existentes');assert.equal(record.user_id,'existing-user')
 assert.ok(paths.some(([path,type])=>path==='/admin/crm/alumnos/[childId]'&&type==='page'))
 assert.ok(paths.some(([path])=>path==='/admin/crm/alumnos'))
 reset();assert.equal((await save(id,{...data,email:'',phone:''})).success,true);assert.equal(record.email,null);assert.equal(record.phone,'')
 for(const patch of [{full_name:' '},{email:'not-email'},{phone:'1'.repeat(41)}]){reset();assert.equal((await save(id,{...data,...patch})).success,false);assert.equal(updates.length,0)}
 reset();assert.equal((await save('invalid',data)).success,false);assert.equal(updates.length,0)
 reset();visible=false;assert.equal((await save(id,data)).success,false);assert.equal(paths.length,0)
 reset();saveError=true;assert.equal((await save(id,data)).success,false);assert.equal(paths.length,0)
 reset();authorized=false;await assert.rejects(save(id,data),/Not authorized/);assert.equal(updates.length,0)
 console.log('PASS: guardian contact validation, admin authorization, scoped update, missing rows/errors, shared-profile refresh; notes, account and relationships preserved. Mock query only, no network or live data changes.')
})().catch(e=>{console.error(e);process.exitCode=1})
