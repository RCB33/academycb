"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
    addDays,
    addMonths,
    addWeeks,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameMonth,
    isToday,
    parseISO,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths,
    subWeeks,
} from "date-fns"
import { es } from "date-fns/locale"
import {
    AlertTriangle,
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    Loader2,
    MapPin,
    Plus,
    Search,
    UserRoundCheck,
    Users,
} from "lucide-react"
import { getCalendarLookups, getEvents } from "@/app/actions/calendar"
import type { CalendarEvent, CalendarEventType, CalendarWorker, CalendarCategory, CalendarTeam } from "@/app/actions/calendar"
import { EventDialog } from "./event-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CalendarView = 'month' | 'week' | 'list'

const TYPE_LABELS: Record<CalendarEventType, string> = {
    general: 'General',
    training: 'Entrenamiento',
    match: 'Partido',
    meeting: 'Reunión',
    campus: 'Campus',
    tournament: 'Torneo',
    absence: 'Ausencia',
}

const SOURCE_LABELS: Record<CalendarEvent['source_type'], string> = {
    manual: 'Manual',
    team: 'Academia',
    campus: 'Campus',
    tournament: 'Torneos',
}

const NAMED_COLORS: Record<string, string> = {
    blue: '#3b82f6', red: '#ef4444', green: '#22c55e', yellow: '#eab308', purple: '#a855f7', black: '#1e293b',
}

function eventColor(color: string | null | undefined) {
    if (!color) return '#3b82f6'
    return NAMED_COLORS[color] || color
}

function eventOccursOn(event: CalendarEvent, day: Date) {
    const dayStart = startOfDay(day).getTime()
    const dayEnd = addDays(startOfDay(day), 1).getTime()
    return new Date(event.start_date).getTime() < dayEnd && new Date(event.end_date).getTime() > dayStart
}

function eventTime(event: CalendarEvent) {
    if (event.is_all_day) return 'Todo el día'
    return `${format(new Date(event.start_date), 'HH:mm')}–${format(new Date(event.end_date), 'HH:mm')}`
}

function workerNames(event: CalendarEvent) {
    return event.workers.map((worker) => worker.full_name).join(', ')
}

function EventPill({ event, list = false, conflict, onClick }: { event: CalendarEvent; list?: boolean; conflict?: boolean; onClick: () => void }) {
    const color = eventColor(event.color)
    const cancelled = event.status === 'cancelled'

    if (list) {
        return (
            <button type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); onClick() }} className={`group mb-3 flex w-full gap-4 rounded-xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${conflict ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-100'} ${cancelled ? 'opacity-55' : ''}`}>
                <span className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: color }} />
                <span className="min-w-0 flex-1">
                    <span className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-bold text-slate-900 ${cancelled ? 'line-through' : ''}`}>{event.title}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{TYPE_LABELS[event.event_type]}</span>
                        {event.source_type !== 'manual' && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{SOURCE_LABELS[event.source_type]}</span>}
                        {event.status === 'tentative' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Por confirmar</span>}
                        {conflict && <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700"><AlertTriangle className="h-3 w-3" /> Solape</span>}
                    </span>
                    <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {eventTime(event)}</span>
                        {event.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>}
                        {event.workers.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {workerNames(event)}</span>}
                    </span>
                    {event.description && <span className="mt-2 block truncate text-xs text-slate-400">{event.description}</span>}
                </span>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-700" />
            </button>
        )
    }

    return (
        <button type="button" onClick={(clickEvent) => { clickEvent.stopPropagation(); onClick() }} title={`${event.title} · ${workerNames(event) || 'Sin responsable'}`} className={`mb-1 flex w-full items-center gap-1.5 truncate rounded-r-md border-l-[3px] px-1.5 py-1 text-left text-[10px] font-medium transition hover:brightness-95 ${cancelled ? 'line-through opacity-50' : ''} ${conflict ? 'ring-1 ring-red-400' : ''}`} style={{ borderLeftColor: color, backgroundColor: `${color}18`, color }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="opacity-80">{event.is_all_day ? 'Día' : format(new Date(event.start_date), 'HH:mm')}</span>
            <span className="truncate font-bold">{event.title}</span>
            {event.workers.length > 0 && <span className="ml-auto shrink-0 rounded-full bg-white/80 px-1 font-bold">{event.workers.length}</span>}
        </button>
    )
}

function WorkerFilter({ worker, count, active, onClick }: { worker: CalendarWorker; count: number; active: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${active ? 'border-yellow-500 bg-yellow-400 font-bold text-black shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}>
            <Avatar className="h-5 w-5">
                <AvatarImage src={worker.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]" style={{ backgroundColor: eventColor(worker.color), color: 'white' }}>{worker.full_name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span>{worker.full_name}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-black text-yellow-400' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
        </button>
    )
}

export function CalendarWidget({ initialView = 'month' }: { initialView?: CalendarView }) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [workers, setWorkers] = useState<CalendarWorker[]>([])
    const [categories, setCategories] = useState<CalendarCategory[]>([])
    const [teams, setTeams] = useState<CalendarTeam[]>([])
    const [view, setView] = useState<CalendarView>(initialView)
    const [selectedWorker, setSelectedWorker] = useState<string>('all')
    const [selectedType, setSelectedType] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

    const fetchEvents = useCallback(async () => {
        setLoading(true)
        const periodWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const periodWeekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        const periodMonthStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
        const periodMonthEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
        const start = view === 'week' ? periodWeekStart : periodMonthStart
        const end = addDays(view === 'week' ? periodWeekEnd : periodMonthEnd, 1)
        const data = await getEvents(start.toISOString(), end.toISOString())
        setEvents(data)
        setLoading(false)
    }, [view, currentDate])

    useEffect(() => {
        void fetchEvents()
    }, [fetchEvents])

    useEffect(() => {
        void getCalendarLookups().then((lookups) => {
            setWorkers(lookups.workers)
            setCategories(lookups.categories)
            setTeams(lookups.teams)
        })
    }, [])

    const conflictEventIds = useMemo(() => {
        const conflicts = new Set<string>()
        const activeEvents = events.filter((event) => event.status !== 'cancelled' && event.worker_ids.length > 0)
        for (let first = 0; first < activeEvents.length; first += 1) {
            for (let second = first + 1; second < activeEvents.length; second += 1) {
                const a = activeEvents[first]
                const b = activeEvents[second]
                const sharesWorker = a.worker_ids.some((workerId) => b.worker_ids.includes(workerId))
                const overlaps = new Date(a.start_date) < new Date(b.end_date) && new Date(a.end_date) > new Date(b.start_date)
                if (sharesWorker && overlaps) {
                    conflicts.add(a.id)
                    conflicts.add(b.id)
                }
            }
        }
        return conflicts
    }, [events])

    const filteredEvents = useMemo(() => {
        const term = searchTerm.trim().toLocaleLowerCase('es')
        return events.filter((event) => {
            if (selectedWorker !== 'all' && !event.worker_ids.includes(selectedWorker)) return false
            if (selectedType !== 'all' && event.event_type !== selectedType && event.source_type !== selectedType) return false
            if (!term) return true
            return [event.title, event.description, event.location, event.category?.name, event.team?.name, workerNames(event)]
                .some((value) => value?.toLocaleLowerCase('es').includes(term))
        })
    }, [events, searchTerm, selectedType, selectedWorker])

    const visibleEvents = filteredEvents.filter((event) => view === 'week'
        ? eventOccursOn(event, weekStart) || (new Date(event.start_date) <= weekEnd && new Date(event.end_date) > weekStart)
        : new Date(event.start_date) < addDays(monthEnd, 1) && new Date(event.end_date) > monthStart)
    const unassignedCount = visibleEvents.filter((event) => event.worker_ids.length === 0 && event.status !== 'cancelled').length
    const assignedWorkersCount = new Set(visibleEvents.flatMap((event) => event.worker_ids)).size
    const visibleConflictCount = visibleEvents.filter((event) => conflictEventIds.has(event.id)).length

    function openCreate(date = currentDate) {
        setSelectedDate(date)
        setEventToEdit(null)
        setIsDialogOpen(true)
    }

    function openEdit(event: CalendarEvent) {
        setSelectedDate(new Date(event.start_date))
        setEventToEdit(event)
        setIsDialogOpen(true)
    }

    function nextPeriod() {
        setCurrentDate((date) => view === 'week' ? addWeeks(date, 1) : addMonths(date, 1))
    }

    function previousPeriod() {
        setCurrentDate((date) => view === 'week' ? subWeeks(date, 1) : subMonths(date, 1))
    }

    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return (
        <div className="flex min-h-[780px] flex-col gap-5 rounded-xl bg-slate-50/60 p-3 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-navy">Calendario General</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Operativa conectada de Academia, Campus, Torneos y equipo de trabajo.</p>
                </div>
                <Button className="h-10 gap-2 bg-yellow-500 font-bold text-black hover:bg-yellow-600" onClick={() => openCreate()}><Plus className="h-4 w-4" /> Crear evento</Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Eventos del periodo</p><p className="mt-1 text-2xl font-black text-slate-900">{visibleEvents.length}</p></div>
                <div className="rounded-xl border bg-white p-4"><p className="flex items-center gap-1 text-xs font-bold uppercase text-slate-400"><UserRoundCheck className="h-3.5 w-3.5" /> Personal activo</p><p className="mt-1 text-2xl font-black text-slate-900">{assignedWorkersCount}</p></div>
                <div className={`rounded-xl border p-4 ${unassignedCount ? 'border-amber-200 bg-amber-50' : 'bg-white'}`}><p className="text-xs font-bold uppercase text-slate-400">Sin responsable</p><p className={`mt-1 text-2xl font-black ${unassignedCount ? 'text-amber-700' : 'text-green-600'}`}>{unassignedCount}</p></div>
                <div className={`rounded-xl border p-4 ${visibleConflictCount ? 'border-red-200 bg-red-50' : 'bg-white'}`}><p className="flex items-center gap-1 text-xs font-bold uppercase text-slate-400"><AlertTriangle className="h-3.5 w-3.5" /> Solapes</p><p className={`mt-1 text-2xl font-black ${visibleConflictCount ? 'text-red-600' : 'text-green-600'}`}>{visibleConflictCount}</p></div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border bg-slate-50 p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previousPeriod}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" className="h-8 px-3 text-sm font-bold" onClick={() => { const today = new Date(); setCurrentDate(today); setSelectedDate(today) }}>Hoy</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextPeriod}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <span className="text-lg font-bold capitalize text-navy">{view === 'week' ? `${format(weekStart, 'd MMM', { locale: es })} – ${format(weekEnd, 'd MMM', { locale: es })}` : format(currentDate, 'MMMM yyyy', { locale: es })}</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex rounded-lg border bg-slate-50 p-1">{(['month', 'week', 'list'] as CalendarView[]).map((option) => <button key={option} type="button" onClick={() => setView(option)} className={`rounded px-3 py-1 text-xs font-semibold ${view === option ? 'bg-white text-navy shadow-sm' : 'text-slate-500'}`}>{option === 'month' ? 'Mes' : option === 'week' ? 'Semana' : 'Lista'}</button>)}</div>
                    <Select value={selectedType} onValueChange={setSelectedType}><SelectTrigger className="h-9 w-full bg-slate-50 sm:w-40"><Filter className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toda la operativa</SelectItem>{Object.entries(TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
                    <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input className="h-9 bg-slate-50 pl-9" placeholder="Buscar evento, equipo…" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm">
                <span className="mr-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-400"><Users className="h-3.5 w-3.5" /> Trabajadores</span>
                <button type="button" onClick={() => setSelectedWorker('all')} className={`rounded-full border px-3 py-1.5 text-sm ${selectedWorker === 'all' ? 'border-yellow-500 bg-yellow-400 font-bold text-black' : 'border-slate-200'}`}>Todos · {events.length}</button>
                {workers.map((worker) => <WorkerFilter key={worker.id} worker={worker} count={events.filter((event) => event.worker_ids.includes(worker.id)).length} active={selectedWorker === worker.id} onClick={() => setSelectedWorker(worker.id)} />)}
            </div>

            <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
                {loading ? <div className="flex flex-1 items-center justify-center gap-2 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando operativa…</div> : (
                    <>
                        {view === 'month' && <><div className="grid grid-cols-7 border-b bg-slate-50/70">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((day) => <div key={day} className="py-3 text-center text-xs font-bold uppercase text-slate-500">{day}</div>)}</div><div className="grid flex-1 grid-cols-7 auto-rows-[minmax(105px,1fr)]">{calendarDays.map((day) => { const dayEvents = filteredEvents.filter((event) => eventOccursOn(event, day)); return <div key={day.toISOString()} onClick={() => openCreate(day)} className={`group min-w-0 cursor-pointer border-b border-r p-1.5 transition hover:bg-slate-50 md:p-2 ${!isSameMonth(day,currentDate) ? 'bg-slate-50/50 text-slate-400' : ''}`}><div className="mb-1 flex justify-between"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday(day) ? 'bg-yellow-500 font-black text-black' : ''}`}>{format(day,'d')}</span><Plus className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100" /></div>{dayEvents.slice(0,4).map((event) => <EventPill key={event.id} event={event} conflict={conflictEventIds.has(event.id)} onClick={() => openEdit(event)} />)}{dayEvents.length > 4 && <span className="pl-1 text-[10px] font-medium text-slate-400">+{dayEvents.length - 4} más</span>}</div>})}</div></>}
                        {view === 'week' && <><div className="grid grid-cols-7 border-b bg-slate-50/70">{weekDays.map((day) => <div key={day.toISOString()} className="py-3 text-center"><p className="text-xs font-bold uppercase text-slate-400">{format(day,'EEE',{locale:es})}</p><p className={`mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg font-black ${isToday(day) ? 'bg-yellow-500 text-black' : ''}`}>{format(day,'d')}</p></div>)}</div><div className="grid flex-1 grid-cols-7">{weekDays.map((day) => <div key={day.toISOString()} onClick={() => openCreate(day)} className="min-w-0 cursor-pointer border-r p-2 hover:bg-slate-50">{filteredEvents.filter((event) => eventOccursOn(event,day)).map((event) => <EventPill key={event.id} event={event} conflict={conflictEventIds.has(event.id)} onClick={() => openEdit(event)} />)}</div>)}</div></>}
                        {view === 'list' && <div className="max-h-[680px] overflow-y-auto p-4 md:p-6">{visibleEvents.length === 0 ? <div className="flex flex-col items-center py-20 text-slate-400"><CalendarIcon className="mb-3 h-14 w-14 opacity-40" /><p>No hay eventos en este periodo.</p></div> : Object.entries(visibleEvents.reduce<Record<string, CalendarEvent[]>>((groups,event) => { const key = format(new Date(event.start_date),'yyyy-MM-dd'); (groups[key] ||= []).push(event); return groups },{})).sort(([a],[b]) => a.localeCompare(b)).map(([date,dayEvents]) => <div key={date} className="mb-7"><div className="sticky top-0 z-10 mb-3 flex items-center gap-3 border-b bg-white/95 py-2 backdrop-blur"><span className="rounded-md bg-slate-950 px-3 py-1 text-sm font-bold text-white">{format(parseISO(date),'d MMM',{locale:es}).toUpperCase()}</span><span className="text-xs font-bold uppercase text-slate-400">{format(parseISO(date),'EEEE',{locale:es})}</span></div>{dayEvents.map((event) => <EventPill key={event.id} event={event} list conflict={conflictEventIds.has(event.id)} onClick={() => openEdit(event)} />)}</div>)}</div>}
                    </>
                )}
            </div>

            <div className="flex flex-wrap gap-4 rounded-xl border bg-white px-4 py-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Los horarios de equipos se generan automáticamente.</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Campus y torneos publicados aparecen sin duplicar.</span>
                <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Los solapes y eventos sin responsable quedan señalados.</span>
            </div>

            <EventDialog isOpen={isDialogOpen} setIsOpen={setIsDialogOpen} selectedDate={selectedDate} eventToEdit={eventToEdit} workers={workers} categories={categories} teams={teams} onEventCreated={() => void fetchEvents()} />
        </div>
    )
}
