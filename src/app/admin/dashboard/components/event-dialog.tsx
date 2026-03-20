"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState, useEffect } from "react"
import { createEvent, getWorkers, updateEvent, deleteEvent } from "@/app/actions/calendar"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Clock } from "lucide-react"

interface EventDialogProps {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    selectedDate: Date | undefined
    eventToEdit?: any
    onEventCreated: () => void
}

export function EventDialog({ isOpen, setIsOpen, selectedDate, eventToEdit, onEventCreated }: EventDialogProps) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [color, setColor] = useState("blue")
    const [workers, setWorkers] = useState<any[]>([])
    const [selectedWorker, setSelectedWorker] = useState<string>("none")

    // Additional fields from original calendar
    const [categories, setCategories] = useState<any[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>("none")
    const [location, setLocation] = useState("")

    // Time Logic
    const [isAllDay, setIsAllDay] = useState(true)
    const [startTime, setStartTime] = useState("10:00")
    const [endTime, setEndTime] = useState("11:30")

    useEffect(() => {
        if (isOpen) {
            getWorkers().then(setWorkers)
            const supabase = createClient()
            supabase.from('categories').select('id, name').order('name').then(({ data }) => {
                if (data) setCategories(data)
            })

            if (eventToEdit) {
                setTitle(eventToEdit.title)
                setDescription(eventToEdit.description || "")
                setColor(eventToEdit.color)
                setSelectedWorker(eventToEdit.worker_id || "none")
                setSelectedCategory(eventToEdit.category_id || "none")
                setLocation(eventToEdit.location || "")
                setIsAllDay(eventToEdit.is_all_day)
                
                if (!eventToEdit.is_all_day) {
                    const start = new Date(eventToEdit.start_date)
                    const end = eventToEdit.end_date ? new Date(eventToEdit.end_date) : start
                    setStartTime(`${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`)
                    setEndTime(`${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`)
                }
            } else {
                // Reset form on new open
                setTitle("")
                setDescription("")
                setSelectedWorker("none")
                setSelectedCategory("none")
                setLocation("")
                setColor("blue")
                setIsAllDay(true)
                setStartTime("10:00")
                setEndTime("11:30")
            }
        }
    }, [isOpen, eventToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDate) return

        setLoading(true)
        try {
            let startIso = selectedDate.toISOString()
            let endIso = selectedDate.toISOString()

            if (!isAllDay) {
                // Combine date with time
                const s = new Date(selectedDate)
                const [sh, sm] = startTime.split(':').map(Number)
                s.setHours(sh, sm)
                startIso = s.toISOString()

                const e = new Date(selectedDate)
                const [eh, em] = endTime.split(':').map(Number)
                e.setHours(eh, em)
                endIso = e.toISOString()
            }

            const formData = {
                title,
                description,
                start_date: startIso,
                end_date: endIso,
                color,
                is_all_day: isAllDay,
                worker_id: selectedWorker === "none" ? null : selectedWorker,
                category_id: selectedCategory === "none" ? null : selectedCategory,
                location: location || null
            }

            const res = eventToEdit 
                ? await updateEvent(eventToEdit.id, formData)
                : await createEvent(formData)

            if (res.success) {
                toast.success(eventToEdit ? "Evento actualizado correctamente" : "Evento creado correctamente")
                // Reset form
                setTitle("")
                setDescription("")
                setSelectedWorker("none")
                setSelectedCategory("none")
                setLocation("")
                setColor("blue")
                setIsAllDay(true)

                setIsOpen(false)
                onEventCreated() // Refresh list
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!eventToEdit) return
        if (!confirm("¿Estás seguro de que quieres eliminar este evento?")) return

        setLoading(true)
        try {
            const res = await deleteEvent(eventToEdit.id)
            if (res.success) {
                toast.success("Evento eliminado")
                setIsOpen(false)
                onEventCreated()
            } else {
                toast.error(res.error)
            }
        } catch(e) {
            toast.error("Error al eliminar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0 border-0 overflow-visible bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl">
                <div className="bg-yellow-500 p-6 flex flex-col gap-1 rounded-t-2xl">
                    <DialogTitle className="text-2xl font-black text-black tracking-tight">
                        {eventToEdit ? "EDITAR EVENTO" : "NUEVO EVENTO"}
                    </DialogTitle>
                    <DialogDescription className="text-black/80 font-medium">
                        {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : "Selecciona una fecha"}
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">
                            Título
                        </Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Entrenamiento, reunión, partido..."
                            className="bg-white border-slate-200 focus:border-yellow-500 focus:ring-yellow-500 h-11 shadow-sm"
                            required
                        />
                    </div>

                    {/* Time Selection Section */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Todo el día
                            </Label>
                            <Switch
                                checked={isAllDay}
                                onCheckedChange={setIsAllDay}
                            />
                        </div>

                        {!isAllDay && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-500 font-bold uppercase">Inicio</Label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="h-9 bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-500 font-bold uppercase">Fin</Label>
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="h-9 bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">
                            Asignar a (Opcional)
                        </Label>
                        <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-yellow-500 h-11 shadow-sm">
                                <SelectValue placeholder="Seleccionar trabajador..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-xl z-[9999]">
                                <SelectItem value="none" className="font-medium text-slate-500">-- General (Sin asignar) --</SelectItem>
                                {workers.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color || 'gray' }} />
                                            {w.full_name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">
                            Asignar a Categoría / Equipo (Opcional)
                        </Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-yellow-500 h-11 shadow-sm">
                                <SelectValue placeholder="Seleccionar equipo..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-xl z-[9999]">
                                <SelectItem value="none" className="font-medium text-slate-500">-- Sin equipo --</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">
                            Ubicación (Opcional)
                        </Label>
                        <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ej. Campo 1, Gimnasio..."
                            className="bg-white border-slate-200 focus:border-yellow-500 focus:ring-yellow-500 h-11 shadow-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">
                            Nota / Descripción
                        </Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalles adicionales..."
                            className="bg-white border-slate-200 focus:border-yellow-500 focus:ring-yellow-500 min-h-[80px] shadow-sm resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">
                            Etiqueta
                        </Label>
                        <div className="flex gap-3">
                            {[
                                { id: 'blue', color: '#3b82f6', label: 'General' },
                                { id: 'green', color: '#22c55e', label: 'Entreno' },
                                { id: 'red', color: '#ef4444', label: 'Importante' },
                                { id: 'yellow', color: '#eab308', label: 'Partido' }
                            ].map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setColor(c.id)}
                                    className={`group relative w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${color === c.id
                                        ? 'border-black scale-110 shadow-md'
                                        : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: c.color }}
                                    title={c.label}
                                >
                                    {color === c.id && (
                                        <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 gap-4">
                        {eventToEdit ? (
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={loading}
                                onClick={handleDelete}
                                className="h-11 px-6 rounded-xl shadow-sm"
                            >
                                Eliminar
                            </Button>
                        ) : (
                            <div /> // Placeholder for spacing using flex-between
                        )}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-black hover:bg-slate-800 text-white font-bold h-11 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : eventToEdit ? "Actualizar Evento" : "Guardar Evento"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
