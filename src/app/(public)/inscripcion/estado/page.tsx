import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasFamilyPortalAccess } from '@/lib/family-portal-access'
import { getFamilyOnboardingState } from '@/lib/family-onboarding'
import { FamilyOnboarding } from '@/components/portal/family-onboarding'
import { getLocale } from '@/lib/i18n/server'
import { getRoleHome, isAppRole } from '@/lib/roles'

export default async function EnrollmentStatusPage() {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) redirect('/inscripcion')
    const { data: profile, error } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (error) throw new Error('No se pudo consultar tu acceso.')
    if (isAppRole(profile?.role) && profile.role !== 'guardian') redirect(getRoleHome(profile.role))
    if (await hasFamilyPortalAccess(db, user)) redirect('/portal/dashboard')
    return <main className="bg-slate-50 px-4 py-10"><FamilyOnboarding state={await getFamilyOnboardingState()} locale={await getLocale()} /></main>
}
