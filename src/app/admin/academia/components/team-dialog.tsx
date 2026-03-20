"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { createTeam, updateTeam } from "@/app/actions/teams"
import { toast } from "sonner"
import { Loader2, Shield } from "lucide-react"

interface TeamDialogProps {
    mode: 'create' | 'edit'
    team?: any
    categories: any[]
    workers: any[]
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const TEAM_COLORS = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Naranja', value: '#f97316' },
    { name: 'Morado', value: '#a855f7' },
    { name: 'Amarillo', value: '#eab308' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Negro', value: '#1e293b' },
]

const WEEKDAYS = [
    { key: 'L', label: 'Lun' },
    { key: 'M', label: 'Mar' },
    { key: 'X', label: 'Mié' },
    { key: 'J', label: 'Jue' },
    { key: 'V', label: 'Vie' },
    { key: 'S', label: 'Sáb' },
]

// Parse "L,X 17:00-18:30" → { days: ['L','X'], startTime: '17:00', endTime: '18:30' }
function parseScheduleString(schedule: string | null): { days: string[], startTime: string, endTime: string } {
    if (!schedule) return { days: [], startTime: '17:00', endTime: '18:30' }

    const timeMatch = schedule.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
    const startTime = timeMatch ? timeMatch[1] : '17:00'
    const endTime = timeMatch ? timeMatch[2] : '18:30'

    const dayPart = schedule.replace(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/, '').trim()
    const dayMap: Record<string, string> = { 'L': 'L', 'M': 'M', 'X': 'X', 'J': 'J', 'V': 'V', 'S': 'S' }
    const days: string[] = []

    // Handle range L-X
    const rangeMatch = dayPart.match(/^([LMXJVS])\s*-\s*([LMXJVS])$/i)
    if (rangeMatch) {
        const order = ['L', 'M', 'X', 'J', 'V', 'S']
        const start = order.indexOf(rangeMatch[1].toUpperCase())
        const end = order.indexOf(rangeMatch[2].toUpperCase())
        for (let i = start; i <= end; i++) days.push(order[i])
    } else {
        // Handle comma-separated L,X,V
        dayPart.split(/[,\s]+/).filter(Boolean).forEach(d => {
            const upper = d.toUpperCase()
            if (dayMap[upper]) days.push(upper)
        })
    }

    return { days, startTime, endTime }
}

// Build "L,X 17:00-18:30" from { days: ['L','X'], startTime: '17:00', endTime: '18:30' }
function buildScheduleString(days: string[], startTime: string, endTime: string): string | null {
    if (days.length === 0) return null
    return `${days.join(',')} ${startTime}-${endTime}`
}

export function TeamDialog({ mode, team, categories, workers, trigger, open, onOpenChange }: TeamDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [color, setColor] = useState(team?.color || '#3b82f6')
    const [categoryId, setCategoryId] = useState(team?.category_id || '')
    const [coachId, setCoachId] = useState(team?.coach_id || '')
    const [selectedDays, setSelectedDays] = useState<string[]>([])
    const [startTime, setStartTime] = useState('17:00')
    const [endTime, setEndTime] = useState('18:30')

    const isControlled = open !== undefined && onOpenChange !== undefined
    const isOpen = isControlled ? open : internalOpen
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen

    useEffect(() => {
        if (isOpen) {
            setColor(team?.color || '#3b82f6')
            setCategoryId(team?.category_id || '')
            setCoachId(team?.coach_id || '')
            const parsed = parseScheduleString(team?.schedule)
            setSelectedDays(parsed.days)
            setStartTime(parsed.startTime)
            setEndTime(parsed.endTime)
        }
    }, [isOpen, team])

    function toggleDay(day: string) {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const schedule = buildScheduleString(selectedDays, startTime, endTime)
        const data = {
            name: formData.get('name') as string,
            category_id: categoryId || null,
            coach_id: coachId || null,
            schedule: schedule,
            max_players: parseInt(formData.get('max_players') as string) || 16,
            status: 'active' as const,
            color: color,
        }

        try {
            let res;
            if (mode === 'create') {
                res = await createTeam(data)
            } else {
                res = await updateTeam(team.id, data)
            }

            if (res.success) {
                toast.success(mode === 'create' ? "Equipo creado correctamente" : "Equipo actualizado")
                setIsOpen(false)
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado al guardar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-lg sm:rounded-2xl shadow-2xl">
                {/* Header con color amarillo de la marca */}
                <div className="bg-yellow-500 p-6 flex flex-col items-center">
                    <div className="h-16 w-16 rounded-2xl bg-black/10 backdrop-blur-xl border border-black/10 flex items-center justify-center mb-3 shadow-xl">
                        <Shield className="h-8 w-8 text-black" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-black tracking-tight uppercase">
                        {mode === 'create' ? 'Nuevo Equipo' : 'Editar Equipo'}
                    </DialogTitle>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Nombre del Equipo</Label>
                        <Input name="name" defaultValue={team?.name} required className="bg-white" placeholder="Ej. Benjamín A" />
                    </div>

                    {/* Categoría + Entrenador */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Categoría</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Entrenador</Label>
                            <Select value={coachId} onValueChange={setCoachId}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Asignar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {workers.map(w => (
                                        <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Días de entrenamiento */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Días de Entrenamiento</Label>
                        <div className="flex gap-2">
                            {WEEKDAYS.map(day => (
                                <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => toggleDay(day.key)}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all
                                        ${selectedDays.includes(day.key)
                                            ? 'bg-yellow-500 border-yellow-500 text-black shadow-md scale-105'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-yellow-300 hover:text-slate-600'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hora inicio/fin + Max jugadores */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Hora Inicio</Label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Hora Fin</Label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Max. Jugadores</Label>
                            <Input name="max_players" type="number" defaultValue={team?.max_players || 16} min={1} className="bg-white" />
                        </div>
                    </div>

                    {/* Color selector */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Color del Equipo</Label>
                        <div className="flex gap-2 pt-1">
                            {TEAM_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${color === c.value ? 'border-slate-900 scale-110 ring-2 ring-offset-2 ring-slate-400' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-black hover:bg-slate-800 text-white font-bold px-6">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {mode === 'create' ? 'Crear Equipo' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
