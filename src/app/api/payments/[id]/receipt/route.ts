import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { receiptBalance } from '@/lib/receipt-balance'
import { PaymentReceiptPdf, type ReceiptPdfData } from '@/components/admin/payment-receipt-pdf'
import { renderToBuffer } from '@react-pdf/renderer'
export const runtime='nodejs'

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
    let access
    try { access=await requireRole(['admin','finance','guardian']) } catch { return new Response('No autorizado',{status:403}) }
    const {id}=await params
    if(!z.string().uuid().safeParse(id).success)return new Response('Recibo no válido',{status:400})
    const {supabase}=access
    const {data:scopedPayment,error}=await supabase.from('payments').select('*,child:children(full_name),manual_receipt_allocations(amount,paid_date,method,voided_at)').eq('id',id).maybeSingle()
    if(error)return new Response('No se pudo cargar el recibo',{status:500})
    let p=scopedPayment
    // Child receipts use the caller's RLS. Shop receipts have no child, so verify
    // the order against the confirmed Auth email before reading receipt details.
    if(!p && access.role==='guardian' && access.user.email_confirmed_at && access.user.email) {
        const admin=createAdminClient()
        const {data:reference,error:referenceError}=await admin.from('payments').select('id,ref_id').eq('id',id).eq('type','shop').maybeSingle()
        if(referenceError)return new Response('No se pudo cargar el recibo',{status:500})
        if(reference?.ref_id) {
            const {data:order,error:orderError}=await admin.from('orders').select('id').eq('id',reference.ref_id).eq('customer_email',access.user.email.trim().toLowerCase()).maybeSingle()
            if(orderError)return new Response('No se pudo comprobar el pedido',{status:500})
            if(order) {
                const result=await admin.from('payments').select('*,child:children(full_name),manual_receipt_allocations(amount,paid_date,method,voided_at)').eq('id',id).eq('type','shop').eq('ref_id',order.id).maybeSingle()
                if(result.error)return new Response('No se pudo cargar el recibo',{status:500})
                p=result.data
            }
        }
    }
    if(!p)return new Response('No encontrado',{status:404})
    const {data:settings}=await supabase.from('academy_settings').select('key,value').in('key',['academy_name','academy_legal_name','academy_cif','academy_address','prices_include_vat'])
    const values=Object.fromEntries((settings||[]).map(s=>[s.key,s.value||'']))
    const b=receiptBalance(p)
    const data:ReceiptPdfData={pricesIncludeVat:values.prices_include_vat==='true',number:`ACB-${id}`,academy:values.academy_name||'Academy Costa Brava',legal:values.academy_legal_name||'',taxId:values.academy_cif||'',address:values.academy_address||'',player:p.child?.full_name||'Sin jugador vinculado',concept:p.description||p.type,month:p.covered_month||'',promotion:p.promotion_label||'',gross:Number(p.gross_amount??p.amount),discount:Number(p.discount_amount||0),amount:Number(p.amount),paid:b.paid,remaining:b.remaining,status:p.status==='paid'&&Number(p.amount)===0&&Number(p.discount_amount)>0?'Bonificado':b.partial?'Pagado parcialmente':({paid:'Pagado',pending:'Pendiente',failed:'Fallido',cancelled:'Anulado',refunded:'Reembolsado'} as Record<string,string>)[p.status]||p.status,due:p.due_date||'',entries:(p.manual_receipt_allocations||[]).map((a:{amount:number;paid_date:string;method:string;voided_at:string|null})=>({amount:Number(a.amount),date:a.paid_date,method:a.method,voided:Boolean(a.voided_at)}))}
    if(!data.entries.length&&p.status==='paid'&&Number(p.amount)>0)data.entries.push({amount:Number(p.amount),date:p.paid_at?.slice(0,10)||'Fecha no registrada',method:p.method,voided:false})
    const pdf=await renderToBuffer(PaymentReceiptPdf({data}))
    return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="recibo-${id}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
}
