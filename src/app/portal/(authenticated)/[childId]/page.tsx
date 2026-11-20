import { getPortalViewer, getFamilyViewScope, familyViewEventVisible } from '@/lib/admin-view'
import { notFound } from 'next/navigation'

import { getT } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'
import PlayerFIFAStats from '../components/player-fifa-stats'
import { TrophyCard } from '@/components/portal/trophy-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendanceRing } from '@/components/portal/attendance-ring'
import { attendanceSummary } from '@/lib/attendance-summary'
import { adminReadAll } from '@/lib/admin-read-all'
import { Button } from '@/components/ui/button'
import { Activity, AlertCircle, CalendarDays, Medal, Trophy } from 'lucide-react'
import { PlayerProfileDetails } from '@/components/portal/player-profile-details'
import { PlayerPhotoEditor } from '@/components/portal/player-photo-editor'
import { ShareProfile } from '@/components/portal/share-profile'
import { ReportDownloadButton } from '@/components/admin/report-download-button'
import Link from 'next/link'

export default async function ChildPage({ params }: { params: Promise<{ childId: string }> }) {
    const translate = await getT()

    const { childId } = await params
    const { supabase, view } = await getPortalViewer()
    const scope = view ? await getFamilyViewScope() : null
    if (scope && !scope.children.some(c => c.id === childId)) notFound()

    // Verify access (guardian of child) - RLS handles query results, but better to check existence
    const { data: child } = await supabase
        .from('children')
        .select('*, category:categories(name)')
        .eq('id', childId)
        .is('archived_at', null)
        .single()

    if (!child) {
        return <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertCircle className="h-7 w-7" /></span><h1 className="mt-5 font-heading text-3xl font-black uppercase text-navy">{translate("Ficha no disponible")}</h1><p className="mt-2 text-sm leading-relaxed text-slate-500">{translate("No hemos encontrado este jugador o tu cuenta no tiene acceso a su ficha. Vuelve a tus jugadores o contacta con Academy.")}</p><Button asChild className="mt-6 bg-gold font-bold text-navy hover:bg-gold-light"><Link href="/portal/dashboard">{translate("Volver a mis jugadores")}</Link></Button></div>
    }

    // Fetch Latest Metrics
    const { data: metrics } = await supabase
        .from('child_metrics')
        .select('*')
        .eq('visible_to_guardian',true)
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


    const [{ data: attendanceRows }, { data: campusEnrollments }, { data: tournamentEnrollments }, {data:groupAssignments}] = await Promise.all([
        adminReadAll((f,t)=>supabase.from('training_sessions').select('attendance,session_date').eq('child_id', childId).eq('visible_to_guardian', true).order('id').range(f,t)),
        supabase.from('campus_enrollments').select('campus_id').eq('child_id', childId).neq('status', 'cancelled'),
        supabase.from('tournament_players').select('tournament_id').eq('child_id', childId).neq('status', 'cancelled'),
        supabase.from('academy_group_assignments').select('team_id').eq('child_id',childId),
    ])
    const attendance = attendanceSummary(attendanceRows || [], new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'}))
    const {total:attendanceTotal,present:attendancePresent}=attendance
    const attendancePercentage=attendance.percentage ?? 0

    // RLS limits the result to this family. We then narrow it to this player,
    // so siblings do not accidentally share the same "next event" card.
    const now = new Date().toISOString()
    const { data: upcomingEvents } = await adminReadAll((f,t)=>supabase
        .from('calendar_events')
        .select('*')
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .order('id').range(f,t))
    const campusIds = new Set((campusEnrollments || []).map((row) => row.campus_id))
    const tournamentIds = new Set((tournamentEnrollments || []).map((row) => row.tournament_id))
    const teamIds=new Set([child.team_id,...(groupAssignments||[]).map(g=>g.team_id)].filter(Boolean))
    const nextEvent = upcomingEvents?.find((event) => {
        if (scope && !familyViewEventVisible(event,scope)) return false
        if(event.status==='cancelled')return false
        if (event.source_type === 'campus') return campusIds.has(event.source_id)
        if (event.source_type === 'tournament') return tournamentIds.has(event.source_id)
        if (event.team_id) return teamIds.has(event.team_id)
        if (event.category_id) return event.category_id === child.category_id
        return event.source_type === 'manual'
    })


    return (
        <div className="space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <PlayerPhotoEditor key={child.id} childId={child.id} name={child.full_name} avatarUrl={child.avatar_url} />
                    <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">{translate(child.full_name)}</h1>
                    <p className="mt-1 text-sm text-slate-500">{translate("Perfil del jugador")}</p>
                    </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {translate(latestMetric ? <ReportDownloadButton
                        student={child}
                        metrics={latestMetric}
                        attendanceStats={{ total: attendanceTotal, present: attendancePresent, percentage: String(attendancePercentage) }}
                        coachNotes={notes && notes.length > 0 ? notes[0].content : "Sin observaciones recientes."}
                    /> : <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500">{translate("Informe disponible tras la primera evaluación")}</span>)}
                    {translate(!view && child.public_share_token && (
                        <ShareProfile token={child.public_share_token} childId={child.id} childName={child.full_name} />
                    ))}
                </div>
            </div>

            <PlayerProfileDetails key={childId} player={child} editable />

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
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gold">{translate("Próximo evento")}</p>
                                {translate(nextEvent ? (
                                    <>
                                        <h3 className="text-xl font-black mb-1">{translate(nextEvent.title)}</h3>
                                        <p className="text-slate-300 text-sm flex items-center gap-1.5 mb-4">
                                            <CalendarDays className="w-4 h-4" />
                                            {translate(new Date(nextEvent.start_date).toLocaleDateString(translate.locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }))} {translate(" • ")}{translate(new Date(nextEvent.start_date).toLocaleTimeString(translate.locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }))}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button asChild size="sm" className="h-9 bg-gold text-navy hover:bg-gold-light font-bold text-xs"><Link href="/portal/calendario">{translate("Ver calendario")}</Link></Button>
                                            <Button asChild size="sm" variant="outline" className="h-9 border-slate-600 bg-transparent text-white hover:bg-slate-700 hover:text-white font-bold text-xs"><Link href="/portal/comunicados">{translate("Ver avisos")}</Link></Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-black mb-1 text-slate-300">{translate("Sin eventos")}</h3>
                                        <p className="text-slate-500 text-sm mb-4">{translate("No hay entrenamientos ni partidos próximos.")}</p>
                                    </>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <AttendanceRing summary={attendance}/>

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
                            <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">{translate("Sala de Trofeos")}</h2>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {translate(childAchievements?.length || 0)} {translate(" de ")}{translate(allAchievements?.length || 0)} {translate(" completados")}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {translate(allAchievements?.map((achievement: any) => {
                            const earned = childAchievements?.find(ca => ca.achievement_id === achievement.id)
                            return (
                                <TrophyCard
                                    key={achievement.id}
                                    achievement={achievement}
                                    isEarned={!!earned}
                                    earnedAt={earned?.earned_at}
                                />
                            )
                        }))}
                        {translate((!allAchievements || allAchievements.length === 0) && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <Trophy className="h-10 w-10 text-slate-300 mb-2 opacity-20" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{translate("No hay trofeos disponibles")}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Photo Gallery */}
                <div className="lg:col-span-full">
                    <Link href={`/portal/videoteca?child=${childId}`} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gold/30 bg-white p-6 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">{translate('Momentos Academy')}</p><h2 className="mt-2 text-2xl font-black text-navy">{translate('Sus fotos y vídeos')}</h2><p className="mt-2 text-sm text-slate-500">{translate('Sube recuerdos y descubre lo que Academy comparte con su equipo.')}</p></div><span className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white">{translate('Abrir galería')} →</span></Link>
                </div>

                {/* Coach Notes */}
                <Card className="border-none shadow-xl bg-white overflow-hidden self-start">
                    <CardHeader className="bg-slate-900 pb-8">
                        <CardTitle className="flex items-center gap-2 text-white text-lg font-black uppercase">
                            <CalendarDays className="h-5 w-5 text-gold" />
                            {translate("Feedback Coach")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 -mt-4 bg-white rounded-t-2xl pt-6">
                        {translate(notes?.map((note) => (
                            <div key={note.id} className="relative border-l-2 border-gold/30 py-1 pl-6">
                                <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full border-2 border-white bg-gold" />
                                <h4 className="font-bold text-slate-900 text-sm leading-none mb-1">{translate(note.title)}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                                    {translate(new Date(note.note_date).toLocaleDateString(translate.locale, { day: 'numeric', month: 'short' }))}
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed">{translate(note.content)}</p>
                            </div>
                        )))}
                        {translate((!notes || notes.length === 0) && (
                            <div className="text-center py-8">
                                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                    <Activity className="h-6 w-6 text-slate-200" />
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{translate("Sin notas recientes")}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
