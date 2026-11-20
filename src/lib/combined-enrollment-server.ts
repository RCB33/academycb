import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { enrollmentPaymentLabel, academyPaymentMessage } from '@/lib/enrollment-payment'
import { enrollmentSchema } from '@/lib/enrollment'
import { campusRegistrationSchemaFor, CAMPUS_VERSION } from '@/lib/campus-registration'
import { tournamentRegistrationSchemaFor } from '@/lib/christmas-tournaments'
import { academySelection, getCampusOffer, getTournamentOffer } from '@/lib/offering-server'
import { offerCampusPrice, offerTournamentQuote } from '@/lib/offering'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFamilyContext } from '@/lib/family-context'
import { deliverRegistrationEmails } from '@/lib/registration-email'

const academy = z.object({ plan_id:z.string(),group_id:z.string(),second_group_id:z.string().optional(),start_date:z.string(),plus:z.enum(['yes','no']),offer_version:z.string(),payment_choice:z.enum(['cash','monthly_card'],{error:academyPaymentMessage}) })
const schema = z.object({
    request_id:z.string().uuid(), guardian_name:enrollmentSchema.shape.guardian_name, email:enrollmentSchema.shape.email, phone:enrollmentSchema.shape.phone,
    notes:z.string().trim().max(1000),privacy_consent:z.literal(true,{error:'Acepta la política de privacidad.'}),terms_consent:z.literal(true,{error:'Acepta las condiciones de inscripción.'}),website:z.string().max(0),
    children:z.array(z.object({
        child_name:enrollmentSchema.shape.child_name,birth_date:enrollmentSchema.shape.birth_date,linked_child_id:enrollmentSchema.shape.linked_child_id,
        academy:academy.optional(),campus:z.record(z.string(),z.unknown()).optional(),tournament:z.record(z.string(),z.unknown()).optional(),
    }).refine(c=>c.academy||c.campus||c.tournament,'Elige al menos una actividad por jugador.')).min(1).max(6),
})

export async function submitCombinedEnrollment(input:unknown) {
    const parsed=schema.safeParse(input)
    if(!parsed.success) return {success:false,error:parsed.error.issues[0]?.message||'Revisa los datos.'}
    const d=parsed.data, family=await getFamilyContext()
    if(d.children.some(c=>c.tournament||[c.academy,c.campus,c.tournament].filter(Boolean).length>1)&&!family) return {success:false,error:'Verifica tu correo antes de combinar actividades o solicitar torneos. No se ha enviado ninguna actividad.'}
    if(family) d.email=family.email
    const seen=new Set<string>(), players=[]
    for(const child of d.children) {
        if(child.linked_child_id) {
            const own=family?.children.find(c=>c.id===child.linked_child_id)
            if(!own) return {success:false,error:'El jugador no pertenece a tu cuenta verificada.'}
            child.child_name=own.full_name
            if(own.birth_date) child.birth_date=own.birth_date
        }
        const identity=child.child_name.trim().toLowerCase()+'|'+child.birth_date
        if(seen.has(identity)) return {success:false,error:'Has repetido un jugador. Selecciona todas sus actividades en una sola ficha.'}
        seen.add(identity)
        const base={child_name:child.child_name,birth_date:child.birth_date,guardian_name:d.guardian_name,email:d.email.toLowerCase(),phone:d.phone,submitted_by:family?.userId||null,linked_child_id:child.linked_child_id||null,status:'new'}
        const enrollments=[]
        let event=null
        try {
            if(child.academy) {
                const details=await academySelection({...child.academy,plus:child.academy.plus==='yes'},child.birth_date)
                enrollments.push({...base,id:randomUUID(),service:'academy',activity_id:null,activity_name:'Academia anual',academy_details:details,campus_details:null,notes:[d.notes,`Forma de pago solicitada: ${enrollmentPaymentLabel(child.academy.payment_choice)}`].filter(Boolean).join('\n')})
            }
            if(child.campus) {
                const selection=z.object({campus_id:z.string().uuid(),offer_version:z.string()}).parse(child.campus)
                const campus=await getCampusOffer(selection.campus_id)
                if(!campus||campus.end_date<new Date().toISOString().slice(0,10)) throw Error('Esta edición de campus ya no admite solicitudes.')
                if(selection.offer_version!==campus.updated_at) throw Error('El programa del campus ha cambiado. Recarga y revisa tu selección.')
                const c=campusRegistrationSchemaFor(campus.public_program.birth_from,campus.public_program.birth_to).parse({...child.campus,...base,website:d.website,privacy_consent:d.privacy_consent})
                const details={...c,quoted_amount:offerCampusPrice(c.weeks,campus.public_program),offer_version:campus.updated_at,program_snapshot:campus.public_program,schedule:campus.schedule,location:campus.location}
                enrollments.push({...base,id:randomUUID(),service:'campus',activity_id:campus.id,activity_name:campus.name,academy_details:null,campus_details:details,notes:[d.notes,`Formulario: ${CAMPUS_VERSION}\nEquipo: ${c.team} · Modalidad: ${c.role}\nSemanas: ${campus.public_program.weeks.filter(w=>c.weeks.includes(w.id)).map(w=>w.label).join('; ')}\nTarifa base: ${details.quoted_amount} €\nForma de pago: ${enrollmentPaymentLabel(c.payment_choice)}\nAlergias: ${c.allergies}\nTarjeta sanitaria: ${c.health_card}\nAutoriza asistencia médica: ${c.medical_consent}\nAutoriza imágenes: ${c.image_consent}\nSegundo hermano: ${c.sibling?c.sibling_name:'No'}\nTalla: ${c.size}\nPreferencias: ${c.preferences}\nMotivo: ${c.reason}\nExpectativas: ${c.expectations}\nAcepta pago, privacidad, salud y participación: Sí. Plaza y pago pendientes.`].filter(Boolean).join('\n')})
            }
            if(child.tournament) {
                const catalog=await getTournamentOffer()
                if(child.tournament.offer_version!==catalog.version) throw Error('Los torneos o precios han cambiado. Recarga y revisa tu selección.')
                const p=tournamentRegistrationSchemaFor(catalog.events).parse({...child.tournament,...base,request_id:randomUUID(),child_id:child.linked_child_id||null,privacy_consent:d.privacy_consent,terms_consent:d.terms_consent,notes:d.notes})
                event={payload:{...p,offer_snapshot:catalog},quote:offerTournamentQuote(p.tournaments,p.owns_kit,catalog).total}
            }
        } catch(e) {return {success:false,error:e instanceof z.ZodError?e.issues[0].message:e instanceof Error?e.message:'Revisa las actividades.'}}
        players.push({enrollments,event})
    }
    // Hash the validated user intent, not random row IDs. Repeating a lost response
    // returns the same batch; changing a submitted batch never adds a second charge/request.
    const fingerprint=createHash('sha256').update(JSON.stringify(d)).digest('hex')
    const {data,error}=await createAdminClient().rpc('submit_combined_enrollment',{batch_id:d.request_id,actor:family?.userId||null,fingerprint,players})
    if(error) return {success:false,error:'No se pudo guardar el conjunto de solicitudes. No se ha guardado parcialmente. Revisa si el jugador ya tiene una solicitud o contacta con Academy.'}
    const sources=data as {source:'enrollment'|'event';id:string}[]
    // Saving is complete even if the provider is temporarily unavailable. Outbox
    // remains retryable; never tell a family to repeat a successfully saved batch.
    await Promise.allSettled(sources.map(s=>deliverRegistrationEmails(s.source,s.id)))
    return {success:true,message:`Hemos recibido ${sources.length} solicitudes para ${d.children.length} ${d.children.length===1?'jugador':'jugadores'}. Cada actividad se revisará por separado. Recibirás sus correos de recepción y, cuando se acepte, la confirmación con las instrucciones de pago. No se ha realizado ningún cargo.`}
}
