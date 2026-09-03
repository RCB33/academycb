import { createClient } from '@/lib/supabase/server'
import PlayerFIFAStats from '../components/player-fifa-stats'
import { TrophyCard } from '@/components/portal/trophy-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, AlertCircle, CalendarDays, Medal, Trophy } from 'lucide-react'
import { PhotoGallery } from '@/components/portal/photo-gallery'
import { ShareProfile } from '@/components/portal/share-profile'
import { ReportDownloadButton } from '@/components/admin/report-download-button'
import Link from 'next/link'

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
        return <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertCircle className="h-7 w-7" /></span><h1 className="mt-5 font-heading text-3xl font-black uppercase text-navy">Ficha no disponible</h1><p className="mt-2 text-sm leading-relaxed text-slate-500">No hemos encontrado este jugador o tu cuenta no tiene acceso a su ficha. Vuelve a tus jugadores o contacta con Academy.</p><Button asChild className="mt-6 bg-gold font-bold text-navy hover:bg-gold-light"><Link href="/portal/dashboard">Volver a mis jugadores</Link></Button></div>
    }

    // Fetch Latest Metrics
    const { data: metrics } = await supabase
        .from('child_metrics')
        .select('*')
        .eq('child_id', childId)
        .order('recorded_at', { ascending: false })
        .limit(10) // Get last 10 for history

    const latestMetric = metrics?.[0] || null

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

    const [{ data: attendanceRows }, { data: campusEnrollments }, { data: tournamentEnrollments }] = await Promise.all([
        supabase.from('training_sessions').select('attendance').eq('child_id', childId).eq('visible_to_guardian', true),
        supabase.from('campus_enrollments').select('campus_id').eq('child_id', childId).neq('status', 'cancelled'),
        supabase.from('tournament_players').select('tournament_id').eq('child_id', childId).neq('status', 'cancelled'),
    ])
    const attendanceTotal = attendanceRows?.length || 0
    const attendancePresent = attendanceRows?.filter((row) => row.attendance === 'present').length || 0
    const attendancePercentage = attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 0

    // RLS limits the result to this family. We then narrow it to this player,
    // so siblings do not accidentally share the same "next event" card.
    const now = new Date().toISOString()
    const { data: upcomingEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(50)
    const campusIds = new Set((campusEnrollments || []).map((row) => row.campus_id))
    const tournamentIds = new Set((tournamentEnrollments || []).map((row) => row.tournament_id))
    const nextEvent = upcomingEvents?.find((event) => {
        if (event.source_type === 'campus') return campusIds.has(event.source_id)
        if (event.source_type === 'tournament') return tournamentIds.has(event.source_id)
        if (event.team_id) return event.team_id === child.team_id
        if (event.category_id) return event.category_id === child.category_id
        return event.source_type === 'manual'
    })

    // Fetch Gallery
    const { data: galleryImages } = await supabase
        .from('media_assets')
        .select('id, url')
        .eq('child_id', childId)
        .eq('media_type', 'image')
        .order('created_at', { ascending: false })

    const signedGalleryImages = await Promise.all((galleryImages || []).map(async (image) => {
        if (!image.url || image.url.startsWith('http')) return image
        const { data } = await supabase.storage.from('gallery').createSignedUrl(image.url, 3600)
        return { ...image, url: data?.signedUrl || '' }
    }))

    return (
        <div className="space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{child.full_name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="rounded border border-gold/20 bg-gold/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-gold">{child.category?.name || 'Academia'}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Gen. {child.birth_year}</span>
                    </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {latestMetric ? <ReportDownloadButton
                        student={child}
                        metrics={latestMetric}
                        attendanceStats={{ total: attendanceTotal, present: attendancePresent, percentage: String(attendancePercentage) }}
                        coachNotes={notes && notes.length > 0 ? notes[0].content : "Sin observaciones recientes."}
                    /> : <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500">Informe disponible tras la primera evaluación</span>}
                    {child.public_share_token && (
                        <ShareProfile token={child.public_share_token} childId={child.id} childName={child.full_name} />
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
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gold">Próximo evento</p>
                                {nextEvent ? (
                                    <>
                                        <h3 className="text-xl font-black mb-1">{nextEvent.title}</h3>
                                        <p className="text-slate-300 text-sm flex items-center gap-1.5 mb-4">
                                            <CalendarDays className="w-4 h-4" />
                                            {new Date(nextEvent.start_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(nextEvent.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button asChild size="sm" className="h-9 bg-gold text-navy hover:bg-gold-light font-bold text-xs"><Link href="/portal/calendario">Ver calendario</Link></Button>
                                            <Button asChild size="sm" variant="outline" className="h-9 border-slate-600 text-white hover:bg-slate-700 hover:text-white font-bold text-xs"><Link href="/portal/comunicados">Ver avisos</Link></Button>
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
                <Card className="relative overflow-hidden border-none bg-gradient-to-r from-gold to-[#b88717] text-white shadow-lg">
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
                                        <span className="inline-flex rounded-full bg-navy px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Próximo objetivo</span>
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
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
                                <Medal className="h-5 w-5 text-gold" />
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
                        initialImages={signedGalleryImages.filter(image => image.url)}
                        canEdit={false}
                    />
                </div>

                {/* Coach Notes */}
                <Card className="border-none shadow-xl bg-white overflow-hidden self-start">
                    <CardHeader className="bg-slate-900 pb-8">
                        <CardTitle className="flex items-center gap-2 text-white text-lg font-black uppercase">
                            <CalendarDays className="h-5 w-5 text-gold" />
                            Feedback Coach
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 -mt-4 bg-white rounded-t-2xl pt-6">
                        {notes?.map((note) => (
                            <div key={note.id} className="relative border-l-2 border-gold/30 py-1 pl-6">
                                <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full border-2 border-white bg-gold" />
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
