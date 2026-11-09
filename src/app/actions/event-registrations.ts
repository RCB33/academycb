'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireUser } from '@/lib/auth'
import { stripeCheckoutMode } from '@/lib/stripe-availability'
import { createAdminClient } from '@/lib/supabase/admin'
import { tournamentRegistrationSchema, tournamentQuote, tournamentIds } from '@/lib/christmas-tournaments'

async function verifiedUser() {
  const { user, supabase } = await requireUser()
  if (!user.email || !user.email_confirmed_at) throw new Error('Verifica tu correo electrónico para continuar.')
  return { user, supabase }
}

export async function getEventFamily() {
  const { user } = await verifiedUser()
  const db = createAdminClient()
  // Email ownership is proved by Auth, never by a submitted form field.
  const { data: candidates, error: guardianError } = await db.from('guardians').select('id,user_id,full_name,phone').ilike('email', user.email!.replace(/[%_]/g, '\\$&'))
  if (guardianError) throw new Error('No se pudo consultar tu ficha familiar.')
  if ((candidates || []).length > 1) throw new Error('Hay varias fichas con tu correo. Contacta con Academy para unificarlas sin perder datos.')
  const candidate = candidates?.[0]
  if (candidate?.user_id && candidate.user_id !== user.id) throw new Error('Contacta con Academy para revisar el acceso a tu ficha.')
  if (candidate && !candidate.user_id) {
    const { error } = await db.from('guardians').update({ user_id: user.id }).eq('id', candidate.id).is('user_id', null)
    if (error) throw new Error('No se pudo enlazar tu cuenta verificada.')
  }
  const { data: guardians, error } = await db.from('guardians').select('id,full_name,phone').eq('user_id', user.id)
  if (error || (guardians?.length || 0) > 1) throw new Error('Contacta con Academy para revisar tu ficha familiar.')
  const guardian = guardians?.[0]
  const { data: links, error: linkError } = guardian ? await db.from('child_guardians').select('child:children(id,full_name,birth_date,archived_at)').eq('guardian_id', guardian.id) : { data: [], error: null }
  if (linkError) throw new Error('No se pudieron recuperar tus jugadores.')
  const children = (links || []).flatMap(link => Array.isArray(link.child) ? link.child : [link.child]).filter(c => c && !c.archived_at)
  const { data: registrations, error: registrationError } = await db.from('event_registrations').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (registrationError) throw new Error('Las inscripciones todavía no están disponibles. Inténtalo más tarde.')
  const { data: bank } = await db.from('event_campaign_settings').select('bank_holder,iban').eq('id', 'christmas-2026').single()
  const checkoutMode = await stripeCheckoutMode()
  const { data: checkoutAttempts } = await db.from('event_checkout_attempts').select('id,registration_id,mode,state').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(100)
  return { guardian, children, registrations: registrations || [], email: user.email, bank, checkoutMode, checkoutAttempts: checkoutAttempts || [] }
}

export async function submitEventRegistration(input: unknown) {
  try {
    const { user, supabase } = await verifiedUser()
    const parsed = tournamentRegistrationSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    if (parsed.data.child_id) {
      const { data: linked } = await supabase.rpc('is_guardian_of', { child_uuid: parsed.data.child_id })
      if (linked !== true) return { error: 'El jugador no pertenece a tu cuenta.' }
      const { data: child } = await supabase.from('children').select('full_name,birth_date').eq('id', parsed.data.child_id).is('archived_at', null).single()
      if (!child) return { error: 'Jugador no disponible.' }
      parsed.data.child_name = child.full_name
      if (child.birth_date) parsed.data.birth_date = child.birth_date
    }
    const quote = tournamentQuote(parsed.data.tournaments, parsed.data.owns_kit)
    const { data, error } = await createAdminClient().rpc('submit_event_registration', { actor: user.id, payload: parsed.data, quote: quote.total })
    if (error) return { error: error.message }
    revalidatePath('/admin/torneos/inscripciones')
    revalidatePath('/torneos/inscripcion')
    return { id: data as string }
  } catch (e) { return { error: e instanceof Error ? e.message : 'No se pudo enviar la solicitud.' } }
}

export async function uploadEventFile(form: FormData) {
  try {
    const { user } = await verifiedUser()
    const id = z.string().uuid().parse(form.get('registration'))
    const kind = z.enum(['proof', 'federation', 'identity', 'health']).parse(form.get('kind'))
    const file = form.get('file')
    if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) throw new Error('Adjunta un PDF, JPG o PNG de hasta 3 MB.')
    const db = createAdminClient()
    const { data: registration } = await db.from('event_registrations').select('id,status').eq('id', id).eq('user_id', user.id).single()
    if (!registration || registration.status === 'cancelled') throw new Error('Solicitud no disponible.')
    if (kind === 'proof' && registration.status !== 'awaiting_payment') throw new Error('Espera a que Academy valide tu solicitud antes de enviar el justificante.')
    const bytes = Buffer.from(await file.arrayBuffer())
    const ext = bytes.subarray(0, 5).toString() === '%PDF-' ? 'pdf' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : null
    if (!ext) throw new Error('Formato de archivo no válido. Usa PDF, JPG o PNG.')
    const path = `${id}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await db.storage.from('event-documents').upload(path, bytes, { contentType: ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : 'png'}`, upsert: false })
    if (uploadError) throw new Error('No se pudo guardar el archivo.')
    const { error } = await db.rpc('attach_event_file', { registration: id, actor: user.id, file_kind: kind, file_path: path, file_name: file.name.replace(/[\r\n/\\]/g, '_').slice(0, 150) })
    if (error) { await db.storage.from('event-documents').remove([path]); throw new Error(error.message) }
    revalidatePath('/torneos/inscripcion'); revalidatePath('/admin/torneos/inscripciones')
    return { success: true }
  } catch (e) { return { error: e instanceof Error ? e.message : 'No se pudo adjuntar el archivo.' } }
}

export async function eventFiles(registrationId: string) {
  const { user, supabase } = await verifiedUser()
  z.string().uuid().parse(registrationId)
  // RLS authorizes the owner or current administrator before using Storage's privileged client.
  const { data: registration } = await supabase.from('event_registrations').select('id,user_id').eq('id', registrationId).single()
  if (!registration) throw new Error('No autorizado')
  if (registration.user_id !== user.id) await requireAdmin()
  const db = createAdminClient()
  const { data, error } = await db.from('event_registration_files').select('id,kind,path,filename,created_at').eq('registration_id', registrationId).order('created_at', { ascending: false })
  if (error) throw new Error('No se pudieron consultar los documentos.')
  return Promise.all((data || []).map(async f => {
    const { data: link } = await db.storage.from('event-documents').createSignedUrl(f.path, 120, { download: f.filename })
    return { id: f.id, kind: f.kind, filename: f.filename, created_at: f.created_at, url: link?.signedUrl || null }
  }))
}

export async function reviewEventRegistration(form: FormData) {
  try {
    const { user } = await requireAdmin()
    const id = z.string().uuid().parse(form.get('id'))
    const operation = z.enum(['approve', 'confirm', 'reject_proof', 'cancel']).parse(form.get('operation'))
    const selections = z.array(z.enum(tournamentIds)).parse(form.getAll('tournaments'))
    const note = z.string().trim().max(1500).parse(form.get('note') || '')
    const db = createAdminClient()
    const { data: registration } = await db.from('event_registrations').select('details').eq('id', id).single()
    if (!registration) throw new Error('Solicitud no encontrada.')
    const amount = operation === 'approve' ? tournamentQuote(selections, registration.details.owns_kit === true).total : null
    const deadline = operation === 'approve' ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(form.get('deadline')) : null
    const { error } = await db.rpc('review_event_registration', { registration: id, actor: user.id, operation, selections, amount, deadline, note })
    if (error) throw new Error(error.message)
    revalidatePath('/admin/torneos/inscripciones'); revalidatePath('/torneos/inscripcion'); revalidatePath('/admin/finanzas')
    return { success: true }
  } catch (e) { return { error: e instanceof Error ? e.message : 'No se pudo actualizar la inscripción.' } }
}

export async function saveEventBankHolder(form: FormData) {
  try {
    await requireAdmin()
    const holder = z.string().trim().min(3).max(150).parse(form.get('bank_holder'))
    const { error } = await createAdminClient().from('event_campaign_settings').update({ bank_holder: holder }).eq('id', 'christmas-2026')
    if (error) throw new Error('No se pudo guardar el titular.')
    revalidatePath('/admin/torneos/inscripciones'); revalidatePath('/torneos/inscripcion')
    return { success: true }
  } catch (e) { return { error: e instanceof Error ? e.message : 'Revisa el titular de la cuenta.' } }
}
