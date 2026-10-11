import { Megaphone } from 'lucide-react'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { ComunicadosClient } from './comunicados-client'
import { getBroadcastHistory, getCategoriesWithTeams } from '@/app/actions/whatsapp'

export const dynamic = 'force-dynamic'

export default async function ComunicadosPage() {
    const { user } = await requireAdmin()
    const [{ categories, teams }, history] = await Promise.all([
        getCategoriesWithTeams(),
        getBroadcastHistory()
    ])

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <PortalPageHeader icon={<Megaphone className="h-6 w-6" />} title="Comunicados" description="Un mensaje. Los canales que tú elijas." />
            <Link href="/admin/comunicados/equipo-tecnico" className="inline-flex rounded-xl border bg-white p-3 font-semibold">Avisos internos al equipo técnico</Link>
            <ComunicadosClient userId={user.id} categories={categories} teams={teams} history={history} />
        </div>
    )
}
