import { createClient } from '@/lib/supabase/server'
import { BroadcastClient } from './broadcast-client'

export const dynamic = 'force-dynamic'

export default async function ComunicadosPage() {
    const supabase = await createClient()

    // Fetch categories for the dropdown
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

    // Optional: Fetch previous broadcast logs if we had a table for it

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Comunicados (WhatsApp Broadcast)</h1>
            <p className="text-muted-foreground">Envía notificaciones instantáneas de WhatsApp a todos los tutores de un equipo o categoría específica.</p>

            <BroadcastClient categories={categories || []} />
        </div>
    )
}
