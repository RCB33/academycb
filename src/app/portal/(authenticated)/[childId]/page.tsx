import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PlayerFIFAStats from '../components/player-fifa-stats'
import { TrophyCard } from '@/components/portal/trophy-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, CalendarDays, Medal, Trophy } from 'lucide-react'
import { format } from 'date-fns' // assuming date-fns might be handy, or just native Date
import { es } from 'date-fns/locale'
import { PhotoGallery } from '@/components/portal/photo-gallery'
import { ShareProfile } from '@/components/portal/share-profile'
import { ReportDownloadButton } from '@/components/admin/report-download-button'

export default async function ChildPage({ params }: { params: Promise<{ childId: string }> }) {
    const { childId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Verify access (guardian of child) - RLS handles query results, but better to check existence
    const { data: child } = await supabase
        .from('children')
        .select('*, category:categories(name)')
        .eq('id', childId)
        .single()

    if (!child) {
        return <div>No se encontró el alumno o no tienes permisos.</div>
    }

    // Fetch Latest Metrics
    const { data: metrics } = await supabase
        .from('child_metrics')
        .select('*')
        .eq('child_id', childId)
        .order('recorded_at', { ascending: false })
        .limit(10) // Get last 10 for history

    const latestMetric = metrics?.[0] || { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50, discipline: 50 }

    // Calculate history OVRs
    const history = metrics?.map(m => {
        const vals = [m.pace, m.shooting, m.passing, m.dribbling, m.defending, m.physical]
        const ovr = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        return { date: m.recorded_at, ovr }
    }).reverse() || []

    // Fetch Notes
    const { data: notes } = await supabase
        .from('coach_notes')
        .select('*')
        .eq('child_id', childId)
        .eq('visibility', 'guardian_visible')
        .order('note_date', { ascending: false })
        .limit(5)

    // Fetch All Achievements and Child Achievements
    const { data: allAchievements } = await supabase.from('achievements').select('*').order('name')
    const { data: childAchievements } = await supabase
        .from('child_achievements')
        .select('*')
        .eq('child_id', childId)

    // Fetch Gallery
    const { data: galleryImages } = await supabase
        .from('media')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{child.full_name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="px-2 py-1 bg-yellow-500/10 rounded text-[10px] font-black text-yellow-600 uppercase tracking-wider border border-yellow-500/20">{child.category?.name || 'Academia'}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Gen. {child.birth_year}</span>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <ReportDownloadButton
                        student={child}
                        metrics={latestMetric}
                        attendanceStats={{ total: 20, present: 18, percentage: "90" }} // Placeholder until attendance is calculated fully
                        coachNotes={notes && notes.length > 0 ? notes[0].content : "Sin observaciones recientes."}
                    />
                    {child.public_share_token && (
                        <ShareProfile token={child.public_share_token} childName={child.full_name} />
                    )}
                </div>
            </div>

            {/* FIFA Stats Section */}
            <PlayerFIFAStats stats={latestMetric} history={history} child={child} />

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Achievements / Trophy Room */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                <Medal className="h-5 w-5 text-yellow-600" />
                            </div>
                            <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Sala de Trofeos</h2>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {childAchievements?.length || 0} de {allAchievements?.length || 0} completados
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {allAchievements?.map((achievement: any) => {
                            const earned = childAchievements?.find(ca => ca.achievement_id === achievement.id)
                            return (
                                <TrophyCard
                                    key={achievement.id}
                                    achievement={achievement}
                                    isEarned={!!earned}
                                    earnedAt={earned?.earned_at}
                                />
                            )
                        })}
                        {(!allAchievements || allAchievements.length === 0) && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <Trophy className="h-10 w-10 text-slate-300 mb-2 opacity-20" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay trofeos disponibles</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Photo Gallery */}
                <div className="lg:col-span-full">
                    <PhotoGallery
                        childId={childId}
                        initialImages={galleryImages || []}
                        canEdit={true}
                    />
                </div>

                {/* Coach Notes */}
                <Card className="border-none shadow-xl bg-white overflow-hidden self-start">
                    <CardHeader className="bg-slate-900 pb-8">
                        <CardTitle className="flex items-center gap-2 text-white text-lg font-black uppercase">
                            <CalendarDays className="h-5 w-5 text-yellow-500" />
                            Feedback Coach
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 -mt-4 bg-white rounded-t-2xl pt-6">
                        {notes?.map((note) => (
                            <div key={note.id} className="relative pl-6 border-l-2 border-yellow-500/30 py-1">
                                <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full bg-yellow-500 border-2 border-white" />
                                <h4 className="font-bold text-slate-900 text-sm leading-none mb-1">{note.title}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                                    {new Date(note.note_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed">{note.content}</p>
                            </div>
                        ))}
                        {(!notes || notes.length === 0) && (
                            <div className="text-center py-8">
                                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                    <Activity className="h-6 w-6 text-slate-200" />
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin notas recientes</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
