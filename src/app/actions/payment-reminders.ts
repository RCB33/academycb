'use server'
import { z } from 'zod'
import { requireFinanceAccess } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPaymentReminder } from '@/lib/payment-reminder'

export async function preparePaymentReminder(paymentId:string) {
    const {supabase}=await requireFinanceAccess()
    return loadPaymentReminder(paymentId,supabase)
}

export async function sendPaymentReminder(input:{paymentId:string;guardianId:string;requestId:string;amountCents:number;recipient:string;reviewed:boolean}) {
    try {
        const {supabase,user}=await requireFinanceAccess()
        const d=z.object({paymentId:z.string().uuid(),guardianId:z.string().uuid(),requestId:z.string().uuid(),amountCents:z.number().int().positive(),recipient:z.string().email(),reviewed:z.literal(true)}).parse(input)
        if(!process.env.RESEND_API_KEY) return {error:'El correo no está configurado. No se ha enviado nada.'}
        const fresh=await loadPaymentReminder(d.paymentId,supabase)
        const guardian=fresh.guardians.find(g=>g.id===d.guardianId&&g.address===d.recipient)
        if(!guardian||fresh.amountCents!==d.amountCents) return {error:'El saldo o el tutor han cambiado. Cierra y revisa el recordatorio de nuevo.'}
        const db=createAdminClient()
        const claim=await db.rpc('claim_payment_reminder',{id_input:d.requestId,actor_input:user.id,payment_input:d.paymentId,guardian_input:d.guardianId,email_input:d.recipient,amount_input:d.amountCents})
        if(claim.error) return {error:claim.error.code==='P0001'?claim.error.message:'No se pudo preparar el envío. Revisa el recibo.'}
        const delivery=claim.data?.[0]
        if(!delivery) return {error:'No se pudo reservar el envío.'}
        if(delivery.status==='sent') return {success:true,alreadySent:true}
        if(delivery.id!==d.requestId) return {error:'Ya hay un aviso de hoy para este tutor y recibo. Revisa el envío anterior antes de repetirlo.'}
        try {
            const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`payment-reminder-${delivery.id}`},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||'Academy Costa Brava <info@academycostabrava.com>',to:[d.recipient],reply_to:'costabravaacademy@gmail.com',subject:fresh.subject,text:fresh.message,html:fresh.html})})
            if(!response.ok) throw Error('Provider rejected')
            const result=await response.json();if(typeof result.id!=='string')throw Error('Invalid provider result')
            const saved=await db.from('payment_reminder_deliveries').update({status:'sent',provider_id:result.id,sent_at:new Date().toISOString()}).eq('id',delivery.id)
            if(saved.error) return {error:'El proveedor ha aceptado el correo, pero falta guardar la confirmación. No repitas el aviso.'}
            return {success:true,alreadySent:false}
        }catch{
            await db.from('payment_reminder_deliveries').update({status:'failed'}).eq('id',delivery.id).neq('status','sent')
            return {error:'No se pudo confirmar el envío. Reintenta desde este mismo aviso; se conserva la protección contra duplicados.'}
        }
    }catch(e){return {error:e instanceof Error?e.message:'No se pudo enviar el recordatorio.'}}
}
