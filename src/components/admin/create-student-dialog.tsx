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
import { createStudent } from "@/app/actions/students"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

import { useRouter } from "next/navigation"

export function CreateStudentDialog({ onUpdate }: { onUpdate?: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        birth_date: '',
        email: '', // Optional for student, but maybe useful for guardian logic later
        guardian_email: '',
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
            const result = await createStudent(formData)
            if (result.success) {
                toast.success("Alumno creado correctamente")
                setOpen(false)
                setFormData({
                    full_name: '',
                    birth_date: '',
                    email: '',
                    guardian_email: '',
                    position: '',
                    preferred_foot: '',
                    shirt_size: '',
                    jersey_number: '',
                })
                if (onUpdate) {
                    onUpdate()
                }
                router.refresh()
            } else {
                toast.error("Error al crear: " + result.error)
            }
        } catch (error) {
            toast.error("Error desconocido")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Alumno
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Alumno</DialogTitle>
                    <DialogDescription>
                        Añade un nuevo jugador a la base de datos.
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
                        <Label htmlFor="guardian_email">Email del Tutor (Opcional)</Label>
                        <Input
                            id="guardian_email"
                            name="guardian_email"
                            type="email"
                            value={formData.guardian_email}
                            onChange={handleChange}
                            placeholder="tutor@ejemplo.com"
                        />
                        <p className="text-[10px] text-muted-foreground">Si el email coincide con un usuario existente, se vinculará automáticamente.</p>
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
                            Crear Alumno
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
