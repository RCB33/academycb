import { createClient } from "@/lib/supabase/server"
import { Video, PlayCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = 'force-dynamic'

export default async function FamilyVideotecaPage() {
    const supabase = await createClient()

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 2. Get children associated with this guardian to find their category IDs
    const { data: guardians } = await supabase
        .from('guardians')
        .select(`
            id,
            child_guardians (
                children (
                    id,
                    full_name,
                    category_id
                )
            )
        `)
        .eq('user_id', user.id)
        .single()

    const childCategories: string[] = []
    if (guardians?.child_guardians) {
        guardians.child_guardians.forEach((cg: any) => {
            if (cg.children?.category_id && !childCategories.includes(cg.children.category_id)) {
                childCategories.push(cg.children.category_id)
            }
        })
    }

    // 3. Fetch media assets for those categories
    let assets: any[] = []
    if (childCategories.length > 0) {
        const { data } = await supabase
            .from('media_assets')
            .select(`
                *,
                categories(name)
            `)
            .in('category_id', childCategories)
            .order('created_at', { ascending: false })

        assets = data || []
    }

    // Fallback logic for thumbnail
    const getYoutubeId = (url: string) => {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
        return match ? match[1] : null
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <Video className="h-8 w-8 text-indigo-600" />
                    Videoteca
                </h1>
                <p className="text-muted-foreground font-medium text-sm">
                    Momentos destacados y partidos de los equipos de tus hijos.
                </p>
            </div>

            {assets.length === 0 ? (
                <Card className="border-dashed shadow-sm bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-20 w-20 bg-white shadow-sm rounded-full flex items-center justify-center mb-6">
                            <Video className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No hay vídeos disponibles</h3>
                        <p className="text-muted-foreground max-w-sm">
                            Aún no se han subido vídeos para el equipo de tus hijos. Cuando los entrenadores suban resúmenes o partidos, aparecerán aquí.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map((asset) => {
                        const vId = getYoutubeId(asset.video_url);
                        const thumb = asset.thumbnail_url || (vId ? `https://img.youtube.com/vi/${vId}/maxresdefault.jpg` : null);

                        return (
                            <Link href={asset.video_url} target="_blank" rel="noopener noreferrer" key={asset.id} className="block group">
                                <Card className="overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1 bg-white">
                                    <div className="relative aspect-video bg-slate-900 overflow-hidden">
                                        {thumb ? (
                                            <div className="w-full h-full relative opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                                                <Image
                                                    src={thumb}
                                                    alt={asset.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="h-14 w-14 bg-indigo-600/90 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 shadow-[0_0_20px_rgba(79,70,229,0.5)] group-hover:scale-110 group-hover:bg-indigo-500 transition-all duration-300">
                                                        <PlayCircle className="h-8 w-8 text-white ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full bg-indigo-950">
                                                <PlayCircle className="h-16 w-16 text-indigo-500/50" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <Badge className="bg-white/10 backdrop-blur-md text-white border-none font-bold shadow-sm">
                                                {asset.categories?.name}
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardContent className="p-5">
                                        <h3 className="font-black text-lg text-slate-900 line-clamp-2 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                                            {asset.title}
                                        </h3>
                                        {asset.description && (
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                                {asset.description}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                {new Date(asset.created_at).toLocaleDateString()}
                                            </span>
                                            <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:bg-indigo-50 font-bold p-0 px-2">
                                                Ver en YouTube
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
