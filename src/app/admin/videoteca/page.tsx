import { getMediaAssets } from "@/app/actions/media"
import { createClient } from "@/lib/supabase/server"
import { MediaAdminClient } from "./media-client"
import { Video, Plus } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function AdminVideotecaPage() {
    const supabase = await createClient()
    const { data: categories } = await supabase.from('categories').select('*').order('name')

    // Fetch all assets for Admin
    const assets = await getMediaAssets()

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Video className="h-8 w-8 text-indigo-600" />
                        Videoteca
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        Sube y gestiona los vídeos de partidos y entrenamientos para las familias.
                    </p>
                </div>
            </div>

            <MediaAdminClient assets={assets} categories={categories || []} />
        </div>
    )
}
