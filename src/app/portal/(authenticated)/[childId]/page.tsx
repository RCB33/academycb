import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PlayerFIFAStats from '../components/player-fifa-stats'
import { TrophyCard } from '@/components/portal/trophy-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

    // Pass raw metrics history to the chart component
    const history = metrics || []

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

    const nextTrophy = allAchievements?.find(a => !childAchievements?.some(ca => ca.achievement_id === a.id))

    // Fetch Next Event
    const now = new Date().toISOString()
    const { data: upcomingEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('category_id', child.category_id)
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(1)
    const nextEvent = upcomingEvents?.[0]

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

            {/* Gamification / Upcoming Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Next Event */}
                <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-lg overflow-hidden relative">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
                        <CalendarDays className="h-32 w-32" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-yellow-500 font-bold uppercase tracking-wider text-[10px] mb-1">Próximo Evento</p>
                                {nextEvent ? (
                                    <>
                                        <h3 className="text-xl font-black mb-1">{nextEvent.title}</h3>
                                        <p className="text-slate-300 text-sm flex items-center gap-1.5 mb-4">
                                            <CalendarDays className="w-4 h-4" />
                                            {new Date(nextEvent.start_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(nextEvent.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="bg-yellow-500 text-slate-900 hover:bg-yellow-400 font-bold text-xs h-8">Ver Detalles</Button>
                                            <Button size="sm" variant="outline" className="border-slate-600 text-white hover:bg-slate-700 hover:text-white font-bold text-xs h-8">Ausencia</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-black mb-1 text-slate-300">Sin eventos</h3>
                                        <p className="text-slate-500 text-sm mb-4">No hay entrenamientos ni partidos próximos.</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Trophy */}
                <Card className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-none shadow-lg overflow-hidden relative">
                    <div className="absolute right-0 top-0 opacity-20 transform translate-x-4 -translate-y-4">
                        <Trophy className="h-32 w-32" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-amber-900 font-bold uppercase tracking-wider text-[10px] mb-1">Siguiente Desafío</p>
                                {nextTrophy ? (
                                    <>
                                        <h3 className="text-xl font-black mb-1 text-slate-900">{nextTrophy.name}</h3>
                                        <p className="text-amber-900 text-sm mb-4 line-clamp-2 max-w-[85%] font-medium">
                                            {nextTrophy.description}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-black/10 h-2 rounded-full overflow-hidden min-w-[120px]">
                                                <div className="bg-slate-900 h-full w-[65%]" />
                                            </div>
                                            <span className="text-[10px] uppercase font-black text-slate-900">En progreso</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-black mb-1 text-slate-900">¡Todo Desbloqueado!</h3>
                                        <p className="text-amber-900 text-sm mb-4">Has conseguido todos los trofeos actuales.</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
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
