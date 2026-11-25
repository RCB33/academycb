'use server'

import { z } from 'zod'
import { requireAdmin, requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTravelTournamentOffer } from '@/lib/travel-tournament-server'
import { travelTournamentInput, travelTournamentSnapshot, travelTournamentSummary } from '@/lib/travel-tournament'
import { deliverRegistrationEmails } from '@/lib/registration-email'
import { onboardAcceptedFamily } from '@/lib/enrollment-onboarding'
import { revalidatePath } from 'next/cache'

export async function submitTravelTournament(input: unknown) {
    try {
        const { user, supabase } = await requireUser()
        if (!user.email || !user.email_confirmed_at) throw new Error('Verifica tu correo antes de enviar la solicitud.')
        const parsed = travelTournamentInput.safeParse(input)
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Revisa los datos y las autorizaciones.')
        const value = parsed.data
        const offer = await getTravelTournamentOffer(value.tournament_id)
        if (!offer) throw new Error('Este torneo no admite solicitudes en este momento.')
        if (value.child_id) {
            const { data: owns, error } = await supabase.rpc('is_guardian_of', { child_uuid: value.child_id })
            if (error || owns !== true) throw new Error('El jugador no pertenece a tu cuenta.')
            const { data: child, error: childError } = await supabase.from('children').select('full_name,birth_date').eq('id', value.child_id).is('archived_at', null).single()
            if (childError || !child?.birth_date) throw new Error('Revisa la fecha de nacimiento de la ficha antes de continuar.')
            value.child_name = child.full_name; value.birth_date = child.birth_date
        }
        const details = travelTournamentSnapshot(offer, value)
        const { data, error } = await createAdminClient().rpc('submit_travel_tournament_request', {
            actor: user.id, verified_email: user.email, payload: { ...value, details, summary: travelTournamentSummary(details) },
        })
        if (error) throw new Error(error.message)
        await deliverRegistrationEmails('enrollment', data as string)
        revalidatePath('/admin/solicitudes'); revalidatePath('/admin/torneos/solicitudes')
        revalidatePath(`/torneos/${offer.id}/inscripcion`)
        return { success: true as const, id: data as string }
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : 'No se pudo enviar la solicitud.' } }
}

export async function acceptTravelTournament(id: string, expected: { version: string; total: number; plan: string }) {
    try {
        const { supabase } = await requireAdmin()
        z.string().uuid().parse(id)
        z.object({ version: z.string().length(64), total: z.number().int().positive(), plan: z.enum(['monthly', 'two']) }).parse(expected)
        const { data: childId, error } = await supabase.rpc('accept_travel_tournament_request', {
            request_uuid: id, expected_version: expected.version, expected_total: expected.total, expected_plan: expected.plan,
        })
        if (error) throw new Error(error.message)
        const { data: request, error: readError } = await supabase.from('enrollment_requests').select('email,tournament_details').eq('id', id).single()
        if (readError || !request) throw new Error('Plaza aceptada. Revisa el acceso familiar y reintenta el correo desde Estado de correos.')
        const access = await onboardAcceptedFamily(childId, request.email)
        const { error: saveError } = await createAdminClient().from('enrollment_requests').update({ tournament_details: { ...request.tournament_details, onboarding: { access: access.status || 'needs_review' } } }).eq('id', id)
        if (saveError) throw new Error('Plaza aceptada. No se pudo guardar el estado del acceso; revisa Estado de correos.')
        await deliverRegistrationEmails('enrollment', id)
        for (const path of ['/admin/solicitudes', '/admin/leads', '/admin/torneos/solicitudes', '/admin/torneos', '/admin/finanzas', '/portal']) revalidatePath(path, 'layout')
        return { success: true as const, message: access.error || 'Plaza aceptada. El correo se ha preparado; consulta su estado en Estado de correos.' }
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : 'No se pudo aceptar la plaza.' } }
}
