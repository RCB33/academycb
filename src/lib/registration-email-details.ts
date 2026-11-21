import 'server-only'
import { paymentChoicesText, requestedPaymentChoices } from '@/lib/enrollment-payment'
import { receiptBalance } from '@/lib/receipt-balance'
import { createAdminClient } from '@/lib/supabase/admin'
import { familyBillingEmail } from '@/lib/family-billing'
import { academyCashInstructions } from '@/lib/academy-cash-instructions'

export function familyAccessMessage(access?:string) {
 const link='Portal familiar: https://www.academycostabrava.com/portal'
 if(access==='invited') return `${link}\nTe hemos enviado un correo separado con tu código de bienvenida. Entra en https://www.academycostabrava.com/portal/codigo?type=invite con el email de la inscripción y ese código. A continuación tendrás que crear tu contraseña personal. Después podrás entrar cuando quieras con tu email y contraseña. Si no encuentras el código, revisa también spam o solicita uno nuevo desde el portal.`
 if(access==='existing') return `${link}\nEntra con tu correo y contraseña habituales. Si no la recuerdas, solicita un código de recuperación: lo recibirás en este mismo email y podrás crear una contraseña nueva. No cambiaremos tu contraseña por inscribir a otro hijo/a.`
 return `${link}\nLa plaza está aceptada. El equipo está revisando tu acceso familiar y te avisará cuando esté listo. Puedes contactar por WhatsApp para organizar el pago.`
}
export type RegistrationEmailDetails={welcome?:boolean;familyAccess?:string;subject:string;message:string;action?:{label:string;href:string}}
export async function registrationEmailDetails(source:string,id:string,kind:string):Promise<RegistrationEmailDetails|null> {
  const db=createAdminClient()
  const contact='\n\nAcademy Costa Brava · costabravaacademy@gmail.com\nWhatsApp: https://wa.me/34691179600'
  const transfer=async(amount:number,name:string)=>{
    const {data,error}=await db.from('event_campaign_settings').select('bank_holder,iban').eq('id','christmas-2026').single()
    if(error||!data?.iban) throw new Error('Payment instructions unavailable')
    return `Importe pendiente: ${amount.toFixed(2)} €\nTransferencia bancaria\n${data.bank_holder?'Titular: '+data.bank_holder+'\n':''}IBAN: ${data.iban}\nConcepto: ${name} · ${id.slice(0,8).toUpperCase()}\nDespués de realizar la transferencia, envía el justificante a https://wa.me/34691179600 indicando el nombre del jugador. Comprobaremos el ingreso; una captura no equivale a un pago recibido.`
  }
  const academyPayment=(amount:number)=>`Importe inicial pendiente: ${amount.toFixed(2)} €.\nAcademia ofrece dos opciones: suscripción mensual con tarjeta mediante Stripe o pago en efectivo.\n¿Prefieres efectivo? Contacta por WhatsApp: https://wa.me/34691179600 para acordar la entrega. La primera cuota parcial, matrícula y extras se gestionan en efectivo por separado. Si ya tienes una suscripción activa, contacta antes de entregar efectivo para evitar pagos duplicados.`
  if(source==='membership'&&kind==='reviewed') {
    const {data:m,error}=await db.from('academy_memberships').select('child_id,start_date,end_date,plan_snapshot,status').eq('id',id).single()
    if(error||!m||!['active','pending_payment'].includes(m.status)||!m.plan_snapshot?.manual_v2) throw new Error('Manual assignment unavailable')
    const {data:child,error:childError}=await db.from('children').select('full_name').eq('id',m.child_id).single()
    if(childError||!child) throw new Error('Player unavailable')
    const {data:receipts,error:paymentError}=await db.from('payments').select('amount,status,concept_code,covered_month,due_date,manual_receipt_allocations(*)').eq('ref_id',id)
    if(paymentError) throw new Error('Payment unavailable')
    const firstDue=(receipts||[]).filter(p=>p.concept_code==='monthly').map(p=>p.due_date).sort()[0]
    const due=(receipts||[]).filter(p=>['pending','failed','overdue'].includes(p.status)&&(p.concept_code!=='monthly'||(m.plan_snapshot.frequency==='mensual'?p.covered_month===m.start_date.slice(0,7):p.due_date===firstDue))).reduce((n,p)=>n+receiptBalance(p).remaining,0)
    const p=m.plan_snapshot
    const groups=(p.groups||[]).map((g:{name:string;schedule:string;public_offer?:{day?:string;location?:string}})=>[g.public_offer?.day,g.name,g.schedule,g.public_offer?.location].filter(Boolean).join(' · ')).join('\n')
    return {welcome:true,familyAccess:p.onboarding?.access||'pending',subject:`¡Enhorabuena, ${child.full_name}! Tu plaza está aceptada`,message:`¡Bienvenidos a la familia Academy Costa Brava! ${child.full_name} ya tiene su plaza aceptada en Academia.\n\n${p.name}\n${groups}\nIncorporación: ${m.start_date}\nFin: ${m.end_date}\n${p.frequency==='mensual'?`Primera mensualidad: ${p.first_percent} % de la cuota.`:'Pago por periodo según el plan elegido.'}\n\n${due?academyPayment(due):'No consta un primer pago pendiente.'}\n\n${familyAccessMessage(p.onboarding?.access)}\n\nAceptar la plaza no acredita el pago.${contact}`}
  }
  if(source==='enrollment') {
    const {data:r,error}=await db.from('enrollment_requests').select('service,child_name,activity_name,status,academy_details,campus_details').eq('id',id).single()
    if(error||!r) throw new Error('Registration unavailable')
    const a=r.academy_details
    const methods = paymentChoicesText(requestedPaymentChoices(r))
    const extra = r.service === 'academy' && (requestedPaymentChoices(r).campus || requestedPaymentChoices(r).tournament) ? '\nCampus y/o Torneos: solicitud adicional pendiente de concretar; su plaza se confirmará por separado.' : ''
    const selection=(a?`${a.plan.name}\n${a.groups.map((g:{name:string;schedule:string;public_offer?:{day:string;location:string}|null})=>[g.name,g.public_offer?.day,g.schedule,g.public_offer?.location].filter(Boolean).join(' · ')).join('\n')}\nIncorporación: ${a.start_date}`:r.activity_name) + (methods ? `\n\nFormas de pago solicitadas:\n${methods}` : '') + extra
    if(kind==='received') {
      let summary=selection
      if(a?.quote) summary+=`\nPrimer mes: ${Number(a.quote.first_month||0).toFixed(2)} €\nMatrícula nuevos jugadores (pendiente de revisar): ${Number(a.quote.enrollment_fee||0).toFixed(2)} €\nPlus: ${Number(a.quote.plus||0).toFixed(2)} €\nDespués: ${a.quote.remaining?.length||0} mensualidades de ${Number(a.quote.monthly_price).toFixed(2)} €, hasta ${a.quote.season_end}.`
      const c=r.campus_details
      if(c?.program_snapshot) summary+=`\n${c.program_snapshot.weeks.filter((w:{id:string})=>c.weeks.includes(w.id)).map((w:{label:string})=>w.label).join(' · ')}\n${c.schedule} · ${c.location}\nImporte previsto: ${Number(c.quoted_amount).toFixed(2)} €${c.sibling?' · Descuento por hermano pendiente de comprobación.':''}`
      return {subject:`${r.child_name}, hemos recibido tu solicitud`,message:`La solicitud de ${r.child_name} se ha guardado correctamente.\n\n${summary}\n\nEl equipo revisará disponibilidad, edad y grupo. Te comunicaremos la aceptación y los siguientes pasos por correo. Este mensaje no confirma una plaza ni acredita un pago. Todavía no realices ningún pago.${contact}`}
    }
    if(kind!=='reviewed'||r.status!=='enrolled') return null
    let payment='',detail=selection
    let action:RegistrationEmailDetails['action']
    if(a?.accepted) {
      const {data:receipts,error:paymentError}=await db.from('payments').select('amount,status,concept_code,covered_month,manual_receipt_allocations(*)').eq('ref_id',a.accepted.membership_id)
      if(paymentError) throw new Error('Payment unavailable')
      const first=(receipts||[]).filter(p=>['pending','failed','overdue'].includes(p.status)&&(p.concept_code!=='monthly'||p.covered_month===a.start_date.slice(0,7)))
      const due=first.reduce((n,p)=>n+receiptBalance(p).remaining,0)
      payment=due?(a.payment_choice==='cash'?academyCashInstructions(due,a.start_date):academyPayment(due)):'El primer pago no tiene importes pendientes.'
      detail+=`\nPrimera cuota: ${Number(a.accepted.first_month).toFixed(2)} € (${a.quote.percent} %)\nMatrícula: ${Number(a.accepted.enrollment_fee).toFixed(2)} €${Number(a.accepted.enrollment_fee)===0?' (exenta)':''} · Plus anual: ${Number(a.accepted.plus).toFixed(2)} €\nMensualidad completa: ${Number(a.quote.monthly_price).toFixed(2)} €, hasta ${a.quote.season_end}.`
      if(a.payment_choice==='monthly_card'&&a.onboarding?.billing_initial===true) {
        payment=due?`Primer pago con tarjeta: ${due.toFixed(2)} €. Incluye juntos el primer mes, la matrícula que corresponda y el Plus elegido. Matrícula y Plus se cobran una sola vez.\nEste importe se cobra al completar Stripe, aunque la incorporación sea más adelante. La primera cuota corresponde al mes ${a.start_date.slice(0,7)} y no se cobrará de nuevo al empezar.${a.quote.remaining?.[0]?.due_date?` El siguiente cobro mensual será el ${a.quote.remaining[0].due_date}.`:''}`:'El primer pago no tiene importes pendientes.'
        if(a.onboarding.billing==='ready'&&a.onboarding.billing_request_id) {
          action={label:a.quote.remaining?.length?'Pagar alta y activar mensualidades':'Pagar el importe inicial',href:`https://www.academycostabrava.com/portal/pagos/solicitud/${a.onboarding.billing_request_id}`}
          payment+=`\n\nRevisa el desglose y paga de forma segura en Stripe:\n${action.href}\n${a.quote.remaining?.length?`Después se cobrará únicamente la cuota mensual de ${Number(a.quote.monthly_price).toFixed(2)} €, en las fechas indicadas, hasta el final de temporada. Sin renovación automática.`:'Es el último mes de la temporada: no hay cargos mensuales posteriores.'}`
        } else payment+='\nAcademy está preparando tu enlace de pago y te avisará cuando esté listo.'
      } else if(a.payment_choice==='monthly_card'&&a.quote.remaining?.length) {
        if(a.onboarding?.billing==='ready'&&a.onboarding.billing_request_id) action={label:'Activar pago mensual con tarjeta',href:`https://www.academycostabrava.com/portal/pagos/solicitud/${a.onboarding.billing_request_id}`} 
        payment+=a.onboarding?.billing==='ready'&&a.onboarding.billing_request_id?`\n\nActiva tu suscripción mensual con tarjeta y olvídate de gestionar cada mensualidad:\nhttps://www.academycostabrava.com/portal/pagos/solicitud/${a.onboarding.billing_request_id}\nEl primer vencimiento será el indicado en el enlace; la suscripción terminará al acabar la temporada.`:'\n\nHas solicitado mensualidades con tarjeta. Academy te enviará el enlace de autorización cuando esté disponible. Todavía no hay ningún cobro automático activado.'
      }
      if(a.family_batch_id&&a.payment_choice==='monthly_card') { const family=await familyBillingEmail(a.family_batch_id);payment=family.message;action=family.action }
    } else if(r.service==='campus') {
      const {data:link}=await db.from('campus_request_links').select('enrollment_id').eq('request_id',id).maybeSingle()
      if(!link) return null
      const {data:receipts,error:paymentError}=await db.from('payments').select('amount,status,manual_receipt_allocations(*)').eq('ref_id',link.enrollment_id)
      if(paymentError||!receipts?.length) throw new Error('Campus payment unavailable')
      const due=receipts.filter(p=>['pending','failed','overdue'].includes(p.status)).reduce((n,p)=>n+receiptBalance(p).remaining,0)
      payment=due?(r.campus_details?.payment_choice === 'cash' ? `Importe pendiente: ${due.toFixed(2)} €\nForma de pago · Campus: efectivo. Contacta por WhatsApp https://wa.me/34691179600 para acordar la entrega. El pago se registrará cuando se reciba el efectivo.` : await transfer(due,r.child_name)):'No consta un pago pendiente para esta inscripción.'
      const p=r.campus_details?.program_snapshot
      if(p) detail+=`\n${r.campus_details.schedule} · ${r.campus_details.location}\n${p.weeks.filter((w:{id:string})=>r.campus_details.weeks.includes(w.id)).map((w:{label:string})=>w.label).join('\n')}\nModalidad: ${r.campus_details.role}`
    } else return null
    return {welcome:true,familyAccess:a?.onboarding?.access||r.campus_details?.onboarding?.access||'pending',action,subject:`¡Enhorabuena, ${r.child_name}! Tu plaza está aceptada`,message:`¡Bienvenidos a la familia Academy Costa Brava! ${r.child_name} ya tiene su plaza aceptada en ${r.service==='academy'?'Academia':r.activity_name}.\n\n${detail}\n\n${payment}\n\n${familyAccessMessage(a?.onboarding?.access||r.campus_details?.onboarding?.access)}\n\nAceptar la plaza no acredita el pago.${contact}`}
  }
  if(source==='event'&&kind==='received') {
    const {data:r,error}=await db.from('event_registrations').select('details,tournaments,quoted_amount').eq('id',id).single()
    if(error||!r) throw new Error('Registration unavailable')
    const names=r.details.offer_snapshot?.events?.filter((e:{id:string})=>r.tournaments.includes(e.id)).map((e:{name:string;date:string})=>`${e.name} · ${e.date}`).join('\n')||'Torneos Academy'
    return {subject:`${r.details.child_name}, hemos recibido tu solicitud de torneos`,message:`Solicitud recibida para ${r.details.child_name}.\n\n${names}\nImporte previsto (equipación incluida cuando corresponde): ${Number(r.quoted_amount).toFixed(2)} €.\n\nAcademy revisará categoría, disponibilidad y compatibilidad de horarios. Recibirás la aceptación y las instrucciones por correo. Este mensaje no confirma la plaza. Todavía no realices ningún pago.${contact}`}
  }
  if(source==='event'&&kind==='awaiting_payment') {
    const {data:r,error}=await db.from('event_registrations').select('status,approved_amount,due_date,details,approved_tournaments').eq('id',id).single()
    if(error||!r) throw new Error('Registration unavailable')
    if(r.status!=='awaiting_payment') return null
    const names=r.details.offer_snapshot?.events?.filter((t:{id:string})=>r.approved_tournaments?.includes(t.id)).map((t:{name:string;date:string})=>`${t.name} · ${t.date}`).join('\n')||'Torneos Academy'
    return {welcome:true,subject:`${r.details.child_name}, tu solicitud de torneos está aceptada`,message:`¡Enhorabuena! Hemos validado la participación solicitada de ${r.details.child_name}.\n\n${names}\n\n${await transfer(Number(r.approved_amount),r.details.child_name)}\nPlazo: ${r.due_date}.\nTambién puedes adjuntar el justificante en https://www.academycostabrava.com/torneos/inscripcion\n\nTu inscripción quedará confirmada tras comprobar el ingreso. No repitas una transferencia ya realizada.${contact}`}
  }
  return null
}
