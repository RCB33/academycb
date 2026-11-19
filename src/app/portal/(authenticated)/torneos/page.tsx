import { Trophy } from 'lucide-react'
import Link from 'next/link'
import { getEventFamily } from '@/app/actions/event-registrations'
import { EventRegistrationForm } from '@/app/(public)/torneos/inscripcion/registration-form'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { getT } from '@/lib/i18n/server'

export default async function FamilyTournamentsPage({ searchParams }: { searchParams: Promise<{ torneo?: string; attempt?: string }> }) {
    const translate = await getT()
    const { torneo, attempt } = await searchParams
    let family: Awaited<ReturnType<typeof getEventFamily>> | null = null
    let error = ''
    try { family = await getEventFamily() }
    catch (e) { error = e instanceof Error ? e.message : 'No se pudo recuperar la cuenta.' }

    return <div className="mx-auto max-w-4xl space-y-6">
        <PortalPageHeader icon={<Trophy className="h-6 w-6" />} title={translate('Mis torneos')} description={translate('Consulta tus inscripciones o solicita una nueva plaza sin salir de tu portal.')} />
        {error ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5"><p>{translate(error)}</p><Link href="/portal/ayuda" className="mt-3 inline-block font-bold underline">{translate('Contactar con Academy')}</Link></div> : family && <EventRegistrationForm family={family} initialTournament={torneo} returnedAttempt={attempt} />}
    </div>
}
