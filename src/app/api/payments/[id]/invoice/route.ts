import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredStripe } from '@/lib/stripe-payments'
import { operationalLog } from '@/lib/operational-log'
import { z } from 'zod'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
const reply=(message:string,status:number)=>new Response(message,{status,headers})

// Read-only document retrieval. Never creates, finalizes, sends or charges an invoice.
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 let access
 try {access=await requireRole(['admin','finance','guardian'])}catch{return reply('No autorizado',403)}
 const {id}=await params
 if(!z.string().uuid().safeParse(id).success)return reply('Recibo no válido',400)
 try {
  const db=access.supabase,admin=createAdminClient()
  const scoped=await db.from('payments').select('id,stripe_invoice_id').eq('id',id).maybeSingle()
  if(scoped.error)throw scoped.error
  let payment=scoped.data
  if(!payment&&access.role==='guardian'&&access.user.email_confirmed_at&&access.user.email){
   const reference=await admin.from('payments').select('id,ref_id,stripe_invoice_id').eq('id',id).eq('type','shop').maybeSingle()
   if(reference.error)throw reference.error
   if(reference.data){
    const order=await admin.from('orders').select('id').eq('id',reference.data.ref_id).eq('customer_email',access.user.email.trim().toLowerCase()).maybeSingle()
    if(order.error)throw order.error
    if(order.data)payment=reference.data
   }
  }
  if(!payment)return reply('No encontrado',404)
  if(!payment.stripe_invoice_id||!/^in_[A-Za-z0-9]+$/.test(payment.stripe_invoice_id))return reply('Este recibo no tiene una factura de Stripe vinculada. Puedes descargar el recibo informativo.',404)
  if(access.role==='guardian'){
   // An invoice can cover siblings: access to one child is insufficient to reveal the others.
   const related=await admin.from('payments').select('id,type,ref_id').eq('stripe_invoice_id',payment.stripe_invoice_id)
   if(related.error||!related.data?.length)throw Error('Invoice scope unavailable')
   const visible=await db.from('payments').select('id').in('id',related.data.map(p=>p.id))
   if(visible.error)throw visible.error
   const allowed=new Set((visible.data||[]).map(p=>p.id))
   const shops=related.data.filter(p=>!allowed.has(p.id)&&p.type==='shop')
   if(shops.length&&access.user.email_confirmed_at&&access.user.email){
    const orders=await admin.from('orders').select('id').in('id',shops.map(p=>p.ref_id)).eq('customer_email',access.user.email.trim().toLowerCase())
    if(orders.error)throw orders.error
    for(const p of shops)if(orders.data?.some(o=>o.id===p.ref_id))allowed.add(p.id)
   }
   if(related.data.some(p=>!allowed.has(p.id)))return reply('Esta factura agrupa otros recibos. Descarga tu recibo individual o contacta con Academy.',403)
  }
  const {stripe,mode}=configuredStripe(true)
  const invoice=await stripe.invoices.retrieve(payment.stripe_invoice_id)
  if(invoice.id!==payment.stripe_invoice_id||invoice.livemode!==(mode==='live')||!invoice.number||!invoice.invoice_pdf||!['open','paid','void','uncollectible'].includes(invoice.status||''))return reply('La factura emitida todavía no está disponible. Puedes descargar el recibo.',409)
  const url=new URL(invoice.invoice_pdf)
  if(url.protocol!=='https:'||url.username||url.password||url.port||!(url.hostname==='stripe.com'||url.hostname.endsWith('.stripe.com')))throw Error('Invalid invoice document host')
  return new Response(null,{status:303,headers:{...headers,Location:url.href}})
 }catch{operationalLog('request.failed',{source:'billing'});return reply('No se pudo consultar la factura. Inténtalo más tarde o descarga el recibo informativo.',503)}
}
