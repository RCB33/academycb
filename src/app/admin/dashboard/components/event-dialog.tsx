"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { CalendarClock, Clock, Link2, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { createEvent, deleteEvent, updateEvent } from "@/app/actions/calendar"
import type {
    CalendarCategory,
    CalendarEvent,
    CalendarEventStatus,
    CalendarEventType,
    CalendarTeam,
    CalendarWorker,
} from "@/app/actions/calendar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface EventDialogProps {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    selectedDate: Date | undefined
    eventToEdit?: CalendarEvent | null
    workers: CalendarWorker[]
    categories: CalendarCategory[]
    teams: CalendarTeam[]
    onEventCreated: () => void
}

const EVENT_TYPES: Array<{ value: CalendarEventType; label: string }> = [
    { value: 'general', label: 'General' },
    { value: 'training', label: 'Entrenamiento' },
    { value: 'match', label: 'Partido' },
    { value: 'meeting', label: 'Reunión' },
    { value: 'campus', label: 'Campus' },
    { value: 'tournament', label: 'Torneo' },
    { value: 'absence', label: 'Ausencia / vacaciones' },
]

const STATUS_OPTIONS: Array<{ value: CalendarEventStatus; label: string }> = [
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'tentative', label: 'Pendiente de confirmar' },
    { value: 'cancelled', label: 'Cancelado' },
]

const EVENT_COLORS = [
    { value: '#3b82f6', label: 'General' },
    { value: '#22c55e', label: 'Entrenamiento' },
    { value: '#ef4444', label: 'Importante' },
    { value: '#eab308', label: 'Partido' },
    { value: '#a855f7', label: 'Reunión' },
    { value: '#14b8a6', label: 'Campus' },
    { value: '#f97316', label: 'Torneo' },
]

function dateInputValue(date: Date) {
    return format(date, 'yyyy-MM-dd')
}

function buildDate(date: string, time: string) {
    return new Date(`${date}T${time}:00`)
}

export function EventDialog({
    isOpen,
    setIsOpen,
    selectedDate,
    eventToEdit,
    workers,
    categories,
    teams,
    onEventCreated,
}: EventDialogProps) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [color, setColor] = useState("#3b82f6")
    const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>("none")
    const [selectedTeam, setSelectedTeam] = useState<string>("none")
    const [location, setLocation] = useState("")
    const [eventType, setEventType] = useState<CalendarEventType>('general')
    const [status, setStatus] = useState<CalendarEventStatus>('confirmed')
    const [visibleToFamilies, setVisibleToFamilies] = useState(false)
    const [isAllDay, setIsAllDay] = useState(false)
    const [startDate, setStartDate] = useState(dateInputValue(new Date()))
    const [endDate, setEndDate] = useState(dateInputValue(new Date()))
    const [startTime, setStartTime] = useState("10:00")
    const [endTime, setEndTime] = useState("11:30")

    const sourceManaged = Boolean(eventToEdit && eventToEdit.source_type !== 'manual')
    const selectedTeamData = useMemo(
        () => teams.find((team) => team.id === selectedTeam),
        [selectedTeam, teams]
    )

    useEffect(() => {
        if (!isOpen) return

        if (eventToEdit) {
            const start = new Date(eventToEdit.start_date)
            const end = new Date(eventToEdit.end_date)
            const inclusiveEnd = eventToEdit.is_all_day ? new Date(end.getTime() - 1) : end
            setTitle(eventToEdit.title)
            setDescription(eventToEdit.description || "")
            setColor(eventToEdit.color || '#3b82f6')
            setSelectedWorkers(eventToEdit.worker_ids)
            setSelectedCategory(eventToEdit.category_id || "none")
            setSelectedTeam(eventToEdit.team_id || "none")
            setLocation(eventToEdit.location || "")
            setEventType(eventToEdit.event_type)
            setStatus(eventToEdit.status)
            setVisibleToFamilies(eventToEdit.visibility === 'families')
            setIsAllDay(eventToEdit.is_all_day)
            setStartDate(dateInputValue(start))
            setEndDate(dateInputValue(inclusiveEnd))
            setStartTime(format(start, 'HH:mm'))
            setEndTime(format(end, 'HH:mm'))
            return
        }

        const initialDate = selectedDate || new Date()
        const dateValue = dateInputValue(initialDate)
        setTitle("")
        setDescription("")
        setColor("#3b82f6")
        setSelectedWorkers([])
        setSelectedCategory("none")
        setSelectedTeam("none")
        setLocation("")
        setEventType('general')
        setStatus('confirmed')
        setVisibleToFamilies(false)
        setIsAllDay(false)
        setStartDate(dateValue)
        setEndDate(dateValue)
        setStartTime("10:00")
        setEndTime("11:30")
    }, [isOpen, eventToEdit, selectedDate])

    function toggleWorker(workerId: string) {
        setSelectedWorkers((current) => current.includes(workerId)
            ? current.filter((id) => id !== workerId)
            : [...current, workerId])
    }

    function handleTeamChange(teamId: string) {
        setSelectedTeam(teamId)
        const team = teams.find((item) => item.id === teamId)
        if (team?.category_id) setSelectedCategory(team.category_id)
        if (team?.coach_id) {
            setSelectedWorkers((current) => current.includes(team.coach_id!) ? current : [...current, team.coach_id!])
        }
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        try {
            const start = isAllDay ? buildDate(startDate, '00:00') : buildDate(startDate, startTime)
            const end = isAllDay
                ? new Date(buildDate(endDate, '00:00').getTime() + 24 * 60 * 60 * 1000)
                : buildDate(endDate, endTime)

            if (end <= start) {
                toast.error('La fecha de fin debe ser posterior al inicio')
                return
            }

            const formData = {
                title,
                description,
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                color,
                is_all_day: isAllDay,
                worker_ids: selectedWorkers,
                category_id: selectedCategory === "none" ? null : selectedCategory,
                team_id: selectedTeam === "none" ? null : selectedTeam,
                location: location || null,
                event_type: eventType,
                status,
                visibility: visibleToFamilies ? 'families' as const : 'internal' as const,
            }

            const result = eventToEdit
                ? await updateEvent(eventToEdit.id, formData)
                : await createEvent(formData)

            if (!result.success) {
                toast.error(result.error)
                return
            }

            toast.success(eventToEdit ? "Evento actualizado" : "Evento creado")
            if (result.warnings?.length) {
                toast.warning(`Atención: ${result.warnings.join(' · ')}`, { duration: 7000 })
            }
            setIsOpen(false)
            onEventCreated()
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado al guardar")
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        if (!eventToEdit || !confirm("¿Eliminar definitivamente este evento?")) return
        setLoading(true)
        try {
            const result = await deleteEvent(eventToEdit.id)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success("Evento eliminado")
            setIsOpen(false)
            onEventCreated()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-0 bg-slate-50 p-0 shadow-2xl sm:rounded-2xl">
                <div className="rounded-t-2xl bg-yellow-500 p-6">
                    <DialogTitle className="text-2xl font-black tracking-tight text-black">
                        {eventToEdit ? "EDITAR EVENTO" : "NUEVO EVENTO"}
                    </DialogTitle>
                    <DialogDescription className="font-medium text-black/70">
                        Coordina personas, equipos, horarios y visibilidad desde una sola ficha.
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
                    {sourceManaged && (
                        <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                            <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>Sincronizado con {eventToEdit?.source_type}. Puedes asignar personal o cambiar su estado; los datos operativos se actualizarán desde el módulo de origen.</p>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="event-title">Título</Label>
                            <Input id="event-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={eventType} onValueChange={(value) => setEventType(value as CalendarEventType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{EVENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <Select value={status} onValueChange={(value) => setStatus(value as CalendarEventStatus)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-white p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Todo el día</Label>
                            <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Fecha inicio</Label>
                                <Input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value) }} required />
                            </div>
                            {!isAllDay && <div className="space-y-1.5"><Label className="text-xs">Hora inicio</Label><Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></div>}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Fecha fin</Label>
                                <Input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
                            </div>
                            {!isAllDay && <div className="space-y-1.5"><Label className="text-xs">Hora fin</Label><Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required /></div>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Trabajadores asignados</Label>
                        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border bg-white p-3">
                            {workers.length === 0 && <span className="text-sm text-slate-400">No hay trabajadores creados.</span>}
                            {workers.map((worker) => {
                                const active = selectedWorkers.includes(worker.id)
                                return (
                                    <button key={worker.id} type="button" onClick={() => toggleWorker(worker.id)} className={`rounded-full border px-3 py-1.5 text-sm transition ${active ? 'border-yellow-500 bg-yellow-100 font-bold text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
                                        {worker.full_name}{worker.position ? ` · ${worker.position}` : ''}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-xs text-slate-500">Puedes seleccionar varios. El sistema avisará si alguno tiene otro evento a la misma hora.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Equipo</Label>
                            <Select value={selectedTeam} onValueChange={handleTeamChange}>
                                <SelectTrigger><SelectValue placeholder="Sin equipo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin equipo</SelectItem>
                                    {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {selectedTeamData?.category && <p className="text-xs text-slate-500">Categoría: {selectedTeamData.category.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin categoría</SelectItem>
                                    {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Ubicación</Label>
                            <Input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={200} placeholder="Campo, oficina, dirección…" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notas operativas</Label>
                        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} className="min-h-20" placeholder="Material, contacto, instrucciones…" />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border bg-white p-4">
                        <div>
                            <Label>Visible para familias</Label>
                            <p className="text-xs text-slate-500">Las reuniones internas y ausencias deben permanecer privadas.</p>
                        </div>
                        <Switch checked={visibleToFamilies} onCheckedChange={setVisibleToFamilies} />
                    </div>

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {EVENT_COLORS.map((option) => <button key={option.value} type="button" title={option.label} aria-label={option.label} onClick={() => setColor(option.value)} className={`h-9 w-9 rounded-full border-2 transition ${color === option.value ? 'scale-110 border-slate-950 shadow-md' : 'border-white opacity-70 hover:opacity-100'}`} style={{ backgroundColor: option.value }} />)}
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t pt-4">
                        {eventToEdit && !sourceManaged ? <Button type="button" variant="destructive" disabled={loading} onClick={handleDelete}>Eliminar</Button> : <div />}
                        <Button type="submit" disabled={loading} className="bg-slate-950 px-7 font-bold text-white hover:bg-slate-800">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                            {eventToEdit ? 'Guardar cambios' : 'Crear evento'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
