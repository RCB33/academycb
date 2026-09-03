import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Clock, CalendarDays, Sparkles } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function CoachDashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 1. Find the worker associated with this login
    let { data: worker } = await supabase
        .from('workers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!worker && user.email) {
        const { data: workerByEmail } = await supabase
            .from('workers')
            .select('*')
            .ilike('email', user.email)
            .maybeSingle()
        worker = workerByEmail
    }

    // 2. Fetch today's events for this worker
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    type CoachEvent = {
        id: string
        title: string
        start_date: string
        end_date: string
        color: string | null
        worker_id: string | null
        categories: { name: string } | null
        teams: { name: string } | null
    }
    let events: CoachEvent[] = []

    if (worker) {
        const { data: assignments } = await supabase
            .from('calendar_event_workers')
            .select('event_id')
            .eq('worker_id', worker.id)
        const assignedIds = new Set((assignments || []).map((assignment) => assignment.event_id))

        const { data } = await supabase
            .from('calendar_events')
            .select(`
                *,
                categories ( name ),
                teams ( name )
            `)
            .lt('start_date', tomorrow.toISOString())
            .gt('end_date', today.toISOString())
            .neq('status', 'cancelled')
            .order('start_date', { ascending: true })

        events = ((data || []) as unknown as CoachEvent[])
            .filter((event) => event.worker_id === worker.id || assignedIds.has(event.id))
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 md:p-8">
            <header className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-lg sm:p-7">
                <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-gold/20" />
                <div className="relative"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold text-navy"><Sparkles className="h-6 w-6" /></span><p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-gold">Tu jornada Academy</p><h1 className="mt-1 font-heading text-3xl font-black uppercase md:text-4xl">Hola, {worker ? worker.full_name : 'Entrenador'}</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Sesiones de hoy, {
                        new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
                    }.
                </p></div>
            </header>

            {!worker ? (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-6">
                        <p className="text-amber-800 text-sm font-medium">
                            Tu cuenta ({user.email}) no parece estar vinculada a un perfil de Entrenador activo.
                            Contacta con coordinación para que añadan tu email a tu ficha de trabajador.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    <h2 className="flex items-center gap-2 font-heading text-2xl font-black uppercase text-navy">
                        <CalendarDays className="h-5 w-5 text-gold" />
                        Tus Entrenos de Hoy
                    </h2>

                    {events.length === 0 ? (
                        <Card className="border-dashed bg-muted/30">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                                <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground font-medium">No tienes sesiones asignadas para hoy.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        events.map(event => (
                            <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <div className={`h-2 w-full`} style={{ backgroundColor: event.color || '#1e3a8a' }} />
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base md:text-lg">{event.title}</CardTitle>
                                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                {new Date(event.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} -
                                                {new Date(event.end_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {(event.teams || event.categories) && (
                                            <div className="bg-navy/5 text-navy px-2.5 py-1 rounded-full text-xs font-semibold">
                                                {event.teams?.name || event.categories?.name}
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="pt-4 flex justify-end">
                                        <Button asChild size="sm" className="w-full bg-gold font-bold text-navy shadow-sm hover:bg-gold-light md:w-auto"><Link href={`/coach/session/${event.id}`}>
                                                <Users className="h-4 w-4 mr-2" />
                                                Pasar Lista y Evaluar
                                        </Link></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
