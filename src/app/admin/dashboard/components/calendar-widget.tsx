"use client"

import { useState, useEffect } from "react"
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    isToday,
    parseISO,
    compareAsc
} from "date-fns"
import { es } from "date-fns/locale"
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Plus,
    Users,
    Clock,
    Calendar as CalendarIcon,
    MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EventDialog } from "./event-dialog"
import { getWorkers, getEvents } from "@/app/actions/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// --- Types ---
interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    color: 'red' | 'green' | 'blue' | 'yellow';
    worker_id?: string;
    workers?: {
        full_name: string;
        color: string;
        avatar_url?: string;
    }
}

// --- Components ---

function WorkerFilter({ name, count, color, active, avatarUrl }: { name: string, count: number, color: string, active?: boolean, avatarUrl?: string }) {
    return (
        <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all
            ${active ? 'bg-yellow-500 border-yellow-500 text-black shadow-md font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}
        `}>
            {!active && (
                avatarUrl ? (
                    <Avatar className="w-5 h-5 border border-slate-200">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-[8px]">{name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                ) : (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color || '#64748b' }} />
                )
            )}
            <span className="text-sm font-medium">{name}</span>
            <span className={`
                text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${active ? 'bg-black text-yellow-500' : 'bg-slate-100 text-slate-500'}
            `}>
                {count}
            </span>
        </div>
    )
}

function EventPill({ event, view = 'month' }: { event: CalendarEvent, view?: 'month' | 'week' | 'list' }) {
    const time = new Date(event.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // Style mappings based on color
    const styles = {
        blue: "bg-blue-50 text-blue-700 border-l-blue-500",
        red: "bg-red-50 text-red-700 border-l-red-500",
        green: "bg-green-50 text-green-700 border-l-green-500",
        yellow: "bg-yellow-50 text-yellow-800 border-l-yellow-500",
    }

    const dotColors = {
        blue: "bg-blue-500",
        red: "bg-red-500",
        green: "bg-green-500",
        yellow: "bg-yellow-500",
    }

    // @ts-ignore
    const currentStyle = styles[event.color] || styles.blue;
    // @ts-ignore
    const currentDot = dotColors[event.color] || dotColors.blue;

    if (view === 'list') {
        return (
            <div className={`flex items-center p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-all gap-4 mb-3 group`}>
                <div className={`w-1.5 self-stretch rounded-full ${currentDot}`} />
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900">{event.title}</span>
                        {event.workers && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                <Users className="w-3 h-3" />
                                {event.workers.full_name}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(new Date(event.start_date), "dd MMM yyyy - HH:mm", { locale: es })}
                        </span>
                    </div>
                    {event.description && <p className="text-xs text-slate-400 mt-2 line-clamp-1">{event.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="group-hover:bg-slate-100 rounded-full">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-black" />
                </Button>
            </div>
        )
    }

    return (
        <div className={`
            text-[10px] w-full p-1.5 rounded-r-md border-l-[3px] mb-1 truncate font-medium
            flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity relative group
            ${currentStyle}
        `} title={event.description}>
            <div className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />
            <span className="opacity-75">{time}</span>
            <span className="font-bold truncate">{event.title}</span>
            {/* Show worker avatar if assigned */}
            {event.workers && (
                <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden border border-black/5">
                    {event.workers.avatar_url ? (
                        <img src={event.workers.avatar_url} alt={event.workers.full_name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-[8px] font-bold text-black/50">{event.workers.full_name[0]}</span>
                    )}
                </div>
            )}
        </div>
    )
}

export function CalendarWidget({ initialView = 'month' }: { initialView?: 'month' | 'week' | 'list' }) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [view, setView] = useState<'month' | 'week' | 'list'>(initialView)
    const [selectedWorker, setSelectedWorker] = useState<string | null>(null)
    const [workers, setWorkers] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    // Navigation Logic
    const nextPeriod = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
        else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1))
        else setCurrentDate(addMonths(currentDate, 1)) // List view jumps by month too
    }

    const prevPeriod = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
        else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1))
        else setCurrentDate(subMonths(currentDate, 1))
    }

    const goToToday = () => {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(now);
    }

    // Initialize Fetch
    useEffect(() => {
        // Fetch a broad range for demo purposes - in real app, fetch based on view range
        getEvents(new Date(2024, 0, 1), new Date(2027, 0, 1)).then((data: any) => setEvents(data || []))
        getWorkers().then(setWorkers)
    }, [])

    // --- Filter Logic ---
    const filteredEvents = events.filter(e => {
        // 1. Worker Filter
        if (selectedWorker && e.worker_id !== selectedWorker) return false;
        // 2. Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return e.title.toLowerCase().includes(term) ||
                e.description?.toLowerCase().includes(term) ||
                e.workers?.full_name.toLowerCase().includes(term);
        }
        return true;
    })

    // --- Grid Generation ---
    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    // Month View Dates
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const monthStartDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const monthEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const calendarDays = eachDayOfInterval({ start: monthStartDate, end: monthEndDate })

    // Week View Dates
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    const weekDaysInterval = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return (
        <div className="flex flex-col gap-6 bg-slate-50/50 p-6 rounded-xl min-h-[800px]">

            {/* --- Header & Toolbar --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-navy tracking-tight">Calendario</h1>
                    <p className="text-muted-foreground text-sm mt-1">Gestiona los entrenamientos y eventos</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-9 gap-2 shadow-md transition-all hover:scale-105" onClick={() => setIsDialogOpen(true)}>
                        <Plus className="h-4 w-4" /> Crear Evento
                    </Button>
                </div>
            </div>

            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between gap-4 items-center">
                <div className="flex items-center gap-2 w-full xl:w-auto">
                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevPeriod}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" className="h-7 px-3 text-sm font-bold" onClick={goToToday}>Hoy</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextPeriod}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <span className="text-xl font-bold capitalize ml-2 text-navy">
                        {view === 'week'
                            ? `Semana ${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM", { locale: es })}`
                            : format(currentDate, "MMMM yyyy", { locale: es })}
                    </span>
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto">
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {['month', 'week', 'list'].map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v as any)}
                                className={`px-3 py-1 text-xs font-semibold rounded transition-all capitalize ${view === v ? 'bg-white shadow-sm text-navy' : 'text-muted-foreground hover:bg-white/50'}`}
                            >
                                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Lista'}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar cliente..."
                            className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* --- Workers Filter --- */}
            <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
                <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 mr-2">
                    <Users className="h-3.5 w-3.5" /> Trabajadores
                </span>
                <div onClick={() => setSelectedWorker(null)}>
                    <WorkerFilter name="Todos" count={filteredEvents.length} color="" active={selectedWorker === null} />
                </div>
                {workers.map((worker) => (
                    <div key={worker.id} onClick={() => setSelectedWorker(worker.id)}>
                        <WorkerFilter
                            name={worker.full_name}
                            count={events.filter(e => e.worker_id === worker.id).length}
                            color={worker.color}
                            active={selectedWorker === worker.id}
                            avatarUrl={worker.avatar_url}
                        />
                    </div>
                ))}
            </div>

            {/* --- Calendar Grid / Main Content --- */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[600px]">

                {/* View: Month */}
                {view === 'month' && (
                    <>
                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
                            {weekDays.map(day => (
                                <div key={day} className="py-3 text-center text-xs font-bold uppercase text-slate-500 tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(120px,1fr)]">
                            {calendarDays.map((day, idx) => {
                                const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.start_date), day));
                                const isCurrentMonth = isSameMonth(day, currentDate)
                                const isTodayDate = isToday(day)

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => { setSelectedDate(day); setIsDialogOpen(true) }}
                                        className={`
                                            border-r border-b border-slate-100 p-2 relative group transition-colors cursor-pointer
                                            ${!isCurrentMonth ? 'bg-slate-50/30' : 'bg-white'}
                                            ${isTodayDate ? 'bg-blue-50/10' : ''}
                                            hover:bg-slate-50
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2 pointer-events-none">
                                            <span className={`
                                                text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-all
                                                ${isTodayDate ? 'bg-yellow-500 text-black shadow-md scale-110 font-black' : 'text-slate-700'}
                                                ${!isCurrentMonth ? 'text-slate-400' : ''}
                                                group-hover:scale-110 group-hover:bg-slate-200 group-hover:text-slate-900
                                                ${isTodayDate ? 'group-hover:bg-yellow-500 group-hover:text-black' : ''}
                                            `}>
                                                {format(day, "d")}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1 pointer-events-none">
                                            {dayEvents.slice(0, 4).map((ev) => <EventPill key={ev.id} event={ev} />)}
                                            {dayEvents.length > 4 && (
                                                <span className="text-[10px] text-muted-foreground font-medium pl-2">+{dayEvents.length - 4} más</span>
                                            )}
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus className="h-4 w-4 text-slate-400" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* View: Week */}
                {view === 'week' && (
                    <div className="flex flex-col h-full min-h-[600px]">
                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
                            {weekDaysInterval.map((day) => {
                                const isTodayDate = isToday(day)
                                return (
                                    <div key={day.toString()} className={`py-3 text-center border-r border-slate-100 last:border-0 ${isTodayDate ? 'bg-yellow-50' : ''}`}>
                                        <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">
                                            {format(day, 'EEE', { locale: es })}
                                        </div>
                                        <div className={`
                                            text-xl font-black w-10 h-10 mx-auto flex items-center justify-center rounded-full
                                            ${isTodayDate ? 'bg-yellow-500 text-black shadow-md' : 'text-slate-700'}
                                        `}>
                                            {format(day, 'd')}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="grid grid-cols-7 flex-1">
                            {weekDaysInterval.map((day, idx) => {
                                const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.start_date), day));
                                const isTodayDate = isToday(day)

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => { setSelectedDate(day); setIsDialogOpen(true) }}
                                        className={`
                                            border-r border-slate-100 p-2 min-h-full cursor-pointer transition-colors group relative
                                            ${isTodayDate ? 'bg-blue-50/5' : ''}
                                            hover:bg-slate-50
                                        `}
                                    >
                                        <div className="flex flex-col gap-2">
                                            {dayEvents.map((ev) => <EventPill key={ev.id} event={ev} />)}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                            <Plus className="w-8 h-8 text-black/10" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* View: List */}
                {view === 'list' && (
                    <div className="p-6 overflow-y-auto max-h-[700px]">
                        {filteredEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <CalendarIcon className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-lg font-medium">No hay eventos para esta búsqueda</p>
                            </div>
                        ) : (
                            // Group events by day
                            (() => {
                                const grouped = filteredEvents.reduce((acc, event) => {
                                    const dateKey = format(new Date(event.start_date), 'yyyy-MM-dd')
                                    if (!acc[dateKey]) acc[dateKey] = []
                                    acc[dateKey].push(event)
                                    return acc
                                }, {} as Record<string, CalendarEvent[]>)

                                const sortedKeys = Object.keys(grouped).sort()

                                return sortedKeys.map(dateKey => (
                                    <div key={dateKey} className="mb-8 last:mb-0">
                                        <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/95 backdrop-blur z-10 py-2 border-b border-slate-100">
                                            <div className="bg-black text-white px-3 py-1 rounded-md font-bold text-sm shadow-sm">
                                                {format(parseISO(dateKey), 'd MMM', { locale: es }).toUpperCase()}
                                            </div>
                                            <div className="h-px flex-1 bg-slate-100" />
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                {format(parseISO(dateKey), 'EEEE', { locale: es })}
                                            </span>
                                        </div>
                                        <div className="pl-4 border-l-2 border-slate-100 space-y-2">
                                            {grouped[dateKey].map((ev: any) => (
                                                <div onClick={() => { setSelectedDate(new Date(ev.start_date)); setIsDialogOpen(true); }}>
                                                    <EventPill key={ev.id} event={ev} view="list" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            })()
                        )}
                    </div>
                )}
            </div>

            <EventDialog
                isOpen={isDialogOpen}
                setIsOpen={setIsDialogOpen}
                selectedDate={selectedDate}
                onEventCreated={() => {
                    // In a real app we would refetch or update optimistic state
                    window.location.reload()
                }}
            />
        </div>
    )
}
