import { createClient } from '@/lib/supabase/server'
import { ComunicadosClient } from './comunicados-client'
import { getBroadcastHistory, getCategoriesWithTeams } from '@/app/actions/whatsapp'

export const dynamic = 'force-dynamic'

export default async function ComunicadosPage() {
    const [{ categories, teams }, history] = await Promise.all([
        getCategoriesWithTeams(),
        getBroadcastHistory()
    ])

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    📢 Centro de Comunicados
                </h1>
                <p className="text-muted-foreground text-sm">Envía mensajes a padres y tutores por WhatsApp o Email</p>
            </div>
            <ComunicadosClient categories={categories} teams={teams} history={history} />
        </div>
    )
}
