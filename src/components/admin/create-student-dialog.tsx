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
        guardian_email: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                setFormData({ full_name: '', birth_date: '', email: '', guardian_email: '' })
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
            <DialogContent className="sm:max-w-[425px]">
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
