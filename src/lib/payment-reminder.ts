import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { receiptBalance } from './receipt-balance'
import { renderCommunicationEmail } from './communication-email'

export async function loadPaymentReminder(paymentId:string, db:SupabaseClient) {
    if(!z.string().uuid().safeParse(paymentId).success) throw Error('Recibo no válido')
    const {data:p,error}=await db.from('payments').select('id,ref_id,child_id,description,type,amount,status,due_date,covered_month,child:children(full_name,archived_at),manual_receipt_allocations(amount,paid_date,method,voided_at)').eq('id',paymentId).single()
    if(error||!p||!p.child_id) throw Error('Recibo no disponible o sin jugador vinculado')
    if(p.type==='academy'&&p.ref_id) {
        const {data:m,error:reviewError}=await db.from('academy_memberships').select('history_review_required,history_reviewed_at').eq('id',p.ref_id).single()
        if(reviewError||!m)throw Error('No se pudo comprobar la revisión de pagos anteriores.')
        if(m.history_review_required&&!m.history_reviewed_at)throw Error('Revisa los pagos anteriores en la ficha del jugador antes de enviar recordatorios.')
    }
    const balance=receiptBalance(p),today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})
    if(!['pending','failed','overdue'].includes(p.status)||balance.remaining<=0) throw Error('Este recibo no tiene saldo pendiente. No se debe enviar un recordatorio.')
    if(!p.due_date||p.due_date>today) throw Error('El recibo todavía no vence o necesita una fecha revisada. No se enviará un recordatorio.')
    const child=(Array.isArray(p.child)?p.child[0]:p.child) as {full_name:string;archived_at:string|null}|null
    if(!child||child.archived_at) throw Error('Jugador no disponible')
    const {data:links,error:linkError}=await db.from('child_guardians').select('guardian:guardians(id,full_name,email,phone)').eq('child_id',p.child_id)
    if(linkError) throw Error('No se pudieron consultar los tutores')
    const period=p.covered_month?new Date(`${p.covered_month}-01T12:00:00Z`).toLocaleDateString('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}):null
    const subject=`Un recordatorio de la cuota de ${child.full_name}`
    const guidance=p.type==='academy'?'Si pagáis en efectivo, escribidnos por WhatsApp para coordinar la entrega. Si usáis la suscripción con tarjeta, contactad con nosotros para revisar el cobro antes de realizar otro pago.':'Podéis consultar las instrucciones de transferencia de vuestra inscripción y enviarnos el justificante por WhatsApp.'
    const message=`Hola, familia.\n\nNos queda pendiente de confirmar ${period?`la cuota de ${period}`:'un pago'} de ${child.full_name}.\n\nConcepto: ${p.description||p.type}.\nImporte pendiente: ${balance.remaining.toFixed(2)} €.\nVencimiento: ${new Date(p.due_date+'T12:00:00Z').toLocaleDateString('es-ES',{timeZone:'UTC'})}.\n\n${guidance}\n\nSi ya lo habéis abonado, disculpad el aviso: escribidnos y lo comprobamos para actualizarlo. No hace falta pagar de nuevo.\n\nWhatsApp: 691 17 96 00 · https://wa.me/34691179600\n\nUn saludo,\nEl equipo de Academy Costa Brava`
    const guardians=(links||[]).flatMap(row=>{
        const g=(Array.isArray(row.guardian)?row.guardian[0]:row.guardian) as {id:string;full_name:string;email:string|null;phone:string|null}|null
        if(!g) return []
        const address=z.string().email().safeParse(g.email?.trim()).success?g.email!.trim().toLowerCase():null
        let phone=(g.phone||'').replace(/\D/g,'');if(phone.length===9)phone='34'+phone
        return [{id:g.id,name:g.full_name,address,whatsapp:/^\d{10,15}$/.test(phone)?`https://wa.me/${phone}?text=${encodeURIComponent(message)}`:null,email:address?`mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`:null}]
    })
    return {subject,message,html:renderCommunicationEmail(subject,message),guardians,amountCents:Math.round(balance.remaining*100)}
}
