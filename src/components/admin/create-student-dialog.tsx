'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

import { useRouter } from "next/navigation"

export function CreateStudentDialog({ onUpdate }: { onUpdate?: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [requestId,setRequestId] = useState('')
    const router = useRouter()
    const supabase = createClient()

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        birth_date: '',
        email: '', // Optional for student, but maybe useful for guardian logic later
        guardian_email: '',
        guardian_name: '',
        guardian_phone: '',
        position: '',
        preferred_foot: '',
        shirt_size: '',
        jersey_number: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const fullName = formData.full_name.trim()
            const birthYear = new Date(`${formData.birth_date}T00:00:00`).getFullYear()
            const jerseyNumber = formData.jersey_number ? Number(formData.jersey_number) : null
            if (!formData.guardian_name.trim()||!formData.guardian_email.trim()||!/^\+?[0-9\s()-]{9,20}$/.test(formData.guardian_phone)) throw new Error('Completa el nombre, correo y teléfono del tutor.')
            if (!fullName) throw new Error('Introduce el nombre completo del alumno.')
            if (!Number.isInteger(birthYear)||formData.birth_date>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})) throw new Error('Introduce una fecha de nacimiento válida.')
            if (jerseyNumber !== null && (!Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99)) {
                throw new Error('El dorsal debe estar entre 1 y 99.')
            }

            const {data:childId,error}=await supabase.rpc('create_player_with_guardian',{
                request_id:requestId,
                details:{...formData,full_name:fullName,guardian_email:formData.guardian_email.trim().toLowerCase()},
            })
            if(error) throw new Error(error.message)
            const child={id:childId}

            toast.success("Jugador y tutor vinculados. Ya puedes elegir su actividad desde la ficha.")
            setOpen(false)
            setFormData({
                full_name: '',
                birth_date: '',
                email: '',
                guardian_email: '',
                guardian_name: '',
                guardian_phone: '',
                position: '',
                preferred_foot: '',
                shirt_size: '',
                jersey_number: '',
            })
            if (onUpdate) onUpdate()
            router.push(`/admin/crm/alumnos/${child.id}?setup=true`)
            router.refresh()
        } catch (error) {
            const message = error instanceof Error && error.message ? error.message : 'No se ha podido crear el alumno. Inténtalo de nuevo.'
            toast.error(`Error al crear: ${message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={value=>{if(loading)return;if(value&&!open)setRequestId(crypto.randomUUID());setOpen(value)}}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo jugador
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Registrar nuevo jugador</DialogTitle>
                    <DialogDescription>
                        Primero creamos la ficha familiar. Después eliges la actividad y revisas su tarifa.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="full_name">Nombre Completo</Label>
                        <Input
                            id="full_name"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                            placeholder="Ej. Leo Messi"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                        <Input
                            id="birth_date"
                            name="birth_date"
                            type="date"
                            value={formData.birth_date}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="guardian_name">Nombre y apellidos del tutor</Label><Input id="guardian_name" name="guardian_name" value={formData.guardian_name} onChange={handleChange} required autoComplete="name"/>
                        <Label htmlFor="guardian_phone">Teléfono del tutor</Label><Input id="guardian_phone" name="guardian_phone" type="tel" value={formData.guardian_phone} onChange={handleChange} required autoComplete="tel"/>
                        <Label htmlFor="guardian_email">Correo del tutor</Label>
                        <Input
                            id="guardian_email"
                            name="guardian_email"
                            required
                            type="email"
                            value={formData.guardian_email}
                            onChange={handleChange}
                            placeholder="tutor@ejemplo.com"
                        />
                        <p className="text-[10px] text-muted-foreground">Si ya existe una ficha de tutor con este correo, la reutilizamos. El acceso al portal se gestiona desde su ficha.</p>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ficha técnica (opcional)</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="position">Posición</Label>
                                <select
                                    id="position"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Sin definir</option>
                                    <option value="Portero">Portero</option>
                                    <option value="Defensa">Defensa</option>
                                    <option value="Lateral">Lateral</option>
                                    <option value="Centrocampista">Centrocampista</option>
                                    <option value="Extremo">Extremo</option>
                                    <option value="Delantero">Delantero</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="preferred_foot">Pierna hábil</Label>
                                <select
                                    id="preferred_foot"
                                    name="preferred_foot"
                                    value={formData.preferred_foot}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Sin definir</option>
                                    <option value="Derecha">Derecha</option>
                                    <option value="Izquierda">Izquierda</option>
                                    <option value="Ambas">Ambas</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="shirt_size">Talla de camiseta</Label>
                                <Input
                                    id="shirt_size"
                                    name="shirt_size"
                                    value={formData.shirt_size}
                                    onChange={handleChange}
                                    placeholder="Ej. M Junior"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="jersey_number">Dorsal</Label>
                                <Input
                                    id="jersey_number"
                                    name="jersey_number"
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={formData.jersey_number}
                                    onChange={handleChange}
                                    placeholder="Ej. 10"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#0C2241] hover:bg-[#1a365d] text-white"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear ficha y continuar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
