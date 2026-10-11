'use server'
import { requireFinanceAccess } from '@/lib/auth'
import { z } from 'zod'

export async function attachPaymentProof(form:FormData){
 const {supabase,user}=await requireFinanceAccess()
 const batch=z.string().uuid().parse(form.get('batch'))
 const file=form.get('file')
 if(!(file instanceof File)||file.size===0||file.size>3*1024*1024)throw new Error('Adjunta un PDF, JPG o PNG de hasta 3 MB')
 const bytes=Buffer.from(await file.arrayBuffer())
 const ext=bytes.subarray(0,5).toString()==='%PDF-'?'pdf':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':null
 if(!ext)throw new Error('El archivo no es un PDF, JPG o PNG válido')
 const {data:b,error:be}=await supabase.from('manual_collection_batches').select('id').eq('id',batch).single()
 if(be||!b)throw new Error('Pago no disponible')
 const path=`${batch}/${crypto.randomUUID()}.${ext}`
 const {error}=await supabase.storage.from('payment-proofs').upload(path,bytes,{contentType:ext==='pdf'?'application/pdf':ext==='jpg'?'image/jpeg':'image/png',upsert:false})
 if(error)throw new Error('No se pudo guardar el archivo')
 const {error:saveError}=await supabase.from('payment_proofs').insert({batch_id:batch,path,filename:file.name.replace(/[\r\n/\\]/g,'_').slice(0,150)||`justificante.${ext}`,created_by:user.id})
 if(saveError)throw new Error('Archivo recibido, pero no se pudo vincular. Contacta con administración antes de repetir.')
 return {success:true}
}
export async function getPaymentProofs(batch:string){
 const {supabase}=await requireFinanceAccess()
 z.string().uuid().parse(batch)
 const {data,error}=await supabase.from('payment_proofs').select('id,path,filename,created_at').eq('batch_id',batch).order('created_at',{ascending:false})
 if(error)throw new Error('No se pudieron consultar los justificantes')
 return Promise.all((data||[]).map(async p=>{const {data:signed}=await supabase.storage.from('payment-proofs').createSignedUrl(p.path,120,{download:p.filename});return {id:p.id,name:p.filename,url:signed?.signedUrl||null}}))
}
