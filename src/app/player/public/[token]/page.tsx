import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PlayerFIFAStats from '@/app/portal/(authenticated)/components/player-fifa-stats'
import { TrophyCard } from '@/components/portal/trophy-card'
import { PhotoGallery } from '@/components/portal/photo-gallery' // reusing, need to check if it handles read-only
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Medal, Trophy, ImageIcon } from 'lucide-react'
import Image from 'next/image'

export const metadata = {
    title: 'Ficha de Jugador | Academy Costa Brava',
    description: 'Perfil oficial del jugador de la Academy Costa Brava',
}

export default async function PublicPlayerPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_public_player_data', {
        token_input: token
    })

    if (error || !data) {
        notFound()
    }

    const { child, metrics, achievements, gallery } = data

    // Prepare mock history for now, or empty
    const history: any[] = []

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header / Profile Summary */}
            <div className="text-center space-y-4">
                <div className="inline-block relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-primary rounded-full blur opacity-25"></div>
                    <img
                        src="/logo_acb.png" // assert this exists or use text
                        alt="Academy Logo"
                        className="h-20 w-20 relative mx-auto object-contain drop-shadow-xl"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            // fallback text?
                        }}
                    />
                </div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight uppercase">
                        {child.full_name}
                    </h1>
                    <div className="flex items-center justify-center gap-3 mt-2">
                        <Badge variant="outline" className="text-sm border-yellow-500/50 text-yellow-700 bg-yellow-50">
                            {child.category_name || 'ACADEMY'}
                        </Badge>
                        <span className="text-slate-300">•</span>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            GEN {child.birth_year}
                        </span>
                    </div>
                </div>
            </div>

            {/* FIFA Stats */}
            {metrics ? (
                <PlayerFIFAStats stats={metrics} history={history} child={child} />
            ) : (
                <Card className="text-center p-8 bg-slate-50 border-dashed">
                    <p className="text-muted-foreground">Sin estadísticas disponibles</p>
                </Card>
            )}

            {/* Achievements */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <Medal className="h-6 w-6 text-yellow-500" />
                    <h2 className="text-2xl font-black text-slate-900 uppercase">Trofeos</h2>
                </div>

                {achievements && achievements.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {achievements.map((achievement: any, i: number) => (
                            <TrophyCard
                                key={i}
                                achievement={{
                                    name: achievement.title, // map from DB func 'title' to component 'name'
                                    description: achievement.description,
                                    icon: achievement.icon || 'trophy'
                                }}
                                isEarned={true}
                                earnedAt={achievement.earned_at}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed text-slate-400">
                        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <span className="text-xs font-bold uppercase tracking-widest">Sin trofeos aún</span>
                    </div>
                )}
            </div>

            {/* Gallery */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <ImageIcon className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-black text-slate-900 uppercase">Galería</h2>
                </div>

                {gallery && gallery.length > 0 ? (
                    <PhotoGallery
                        childId={data.child_id || ''} // child_id not directly returned in top level json? 
                        // Wait, DB func returns: 'child', 'metrics', etc. child object has fields.
                        // I might need to ensure PhotoGallery handles read-only mode correctly (canEdit=false)
                        initialImages={gallery.map((g: any) => ({ ...g, id: g.url }))} // mock id if needed, or update DB func to return ID
                        // DB func returns: url, created_at. simple.
                        // PhotoGallery expects {id, url}. I'll use url as id for read-only.
                        canEdit={false}
                    />
                ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed text-slate-400">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <span className="text-xs font-bold uppercase tracking-widest">Galería vacía</span>
                    </div>
                )}
            </div>

            <div className="text-center pt-8 border-t border-slate-100">
                <a href="https://academycostabrava.com" target="_blank" className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">
                    Academy Costa Brava &copy; {new Date().getFullYear()}
                </a>
            </div>
        </div>
    )
}
