import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Clock, CalendarDays, ExternalLink } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function CoachDashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 1. Find the worker associated with this login
    const { data: worker } = await supabase
        .from('workers')
        .select('*')
        .eq('email', user.email)
        .single()

    // 2. Fetch today's events for this worker
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let events: any[] = []

    if (worker) {
        const { data } = await supabase
            .from('calendar_events')
            .select(`
                *,
                categories ( name )
            `)
            .eq('worker_id', worker.id)
            .gte('start_date', today.toISOString())
            .lt('start_date', tomorrow.toISOString())
            .order('start_date', { ascending: true })

        events = data || []
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
                    Hola, {worker ? worker.full_name : 'Entrenador'}
                </h1>
                <p className="text-muted-foreground text-sm">
                    Este es tu resumen de sesiones para hoy, {
                        new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
                    }.
                </p>
            </div>

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
                    <h2 className="text-lg font-semibold flex items-center gap-2">
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
                                        {event.categories && (
                                            <div className="bg-navy/5 text-navy px-2.5 py-1 rounded-full text-xs font-semibold">
                                                {event.categories.name}
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="pt-4 flex justify-end">
                                        <Link href={`/coach/session/${event.id}`}>
                                            <Button size="sm" className="bg-gold hover:bg-gold/90 text-navy font-bold w-full md:w-auto shadow-sm">
                                                <Users className="h-4 w-4 mr-2" />
                                                Pasar Lista y Evaluar
                                            </Button>
                                        </Link>
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
