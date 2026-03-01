import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar as CalendarIcon, MapPin, Search } from 'lucide-react'
import { AttendanceClient } from './attendance-client'
import { Input } from '@/components/ui/input' // Optional, for future use

export default async function SessionDetailsPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()

    // 1. Validate Access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/portal')

    const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('email', user.email)
        .single()

    // 2. Fetch Event
    const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .select('*, categories(name)')
        .eq('id', params.id)
        .single()

    if (!event || eventError) {
        return <div className="p-8 text-center text-red-500 pb-8">Sesión no encontrada.</div>
    }

    // Optional Check: Ensure this worker is the coach or they are admin
    // if (event.worker_id !== worker?.id) { ... }

    if (!event.category_id) {
        return (
            <div className="p-4 max-w-lg mx-auto mt-10">
                <Link href="/coach" className="text-navy flex items-center gap-1 font-medium mb-6">
                    <ChevronLeft className="h-4 w-4" /> Volver
                </Link>
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                    Esta sesión no tiene una categoría (equipo) asignada, por lo que no se puede pasar lista.
                    Por favor, contacta con coordinación.
                </div>
            </div>
        )
    }

    const sessionDateStr = new Date(event.start_date).toISOString().split('T')[0]

    // 3. Fetch Children in this Category
    const { data: children } = await supabase
        .from('children')
        .select('id, full_name')
        .eq('category_id', event.category_id)
        .order('full_name', { ascending: true })

    // 4. Fetch existing attendance for this date
    const { data: sessions } = await supabase
        .from('training_sessions')
        .select('child_id, attendance')
        .eq('session_date', sessionDateStr)

    // Merge data
    const kidsData = (children || []).map(child => {
        const sessionRecord = sessions?.find(s => s.child_id === child.id)
        return {
            id: child.id,
            full_name: child.full_name,
            attendance: sessionRecord ? sessionRecord.attendance : null as any
        }
    })

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <Link href="/coach" className="inline-flex items-center gap-1 text-muted-foreground hover:text-navy font-medium mb-4 transition-colors">
                <ChevronLeft className="h-5 w-5" /> Volver al panel
            </Link>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
                <div className="flex gap-2 items-center mb-2">
                    <span className="bg-navy/10 text-navy font-bold px-2.5 py-1 rounded-md text-xs uppercase tracking-wider">
                        {event.categories?.name}
                    </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                    {event.title}
                </h1>

                <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        <span>
                            {new Date(event.start_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            <span className="mx-2">•</span>
                            {new Date(event.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4 mt-8 px-1">
                <h2 className="text-lg font-bold text-navy">Asistencia ({kidsData.length})</h2>
                <div className="flex gap-2 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> P</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"></span> F</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> J</span>
                </div>
            </div>

            {kidsData.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-slate-50 rounded-xl border border-dashed">
                    No hay jugadores registrados en esta categoría.
                </div>
            ) : (
                <AttendanceClient childrenData={kidsData} sessionDate={sessionDateStr} />
            )}
        </div>
    )
}
