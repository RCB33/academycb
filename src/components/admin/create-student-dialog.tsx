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
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-0 shadow-2xl">
                <div className="bg-slate-900 px-6 py-4">
                    <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                        <Plus className="h-4 w-4 text-yellow-500" />
                        Registrar Nuevo Alumno
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Añade un nuevo jugador a la base de datos.
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6 grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="full_name" className="text-slate-700">Nombre Completo</Label>
                        <Input
                            id="full_name"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                            placeholder="Ej. Leo Messi"
                            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="birth_date" className="text-slate-700">Fecha de Nacimiento</Label>
                        <Input
                            id="birth_date"
                            name="birth_date"
                            type="date"
                            value={formData.birth_date}
                            onChange={handleChange}
                            required
                            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="guardian_email" className="text-slate-700">Email del Tutor (Opcional)</Label>
                        <Input
                            id="guardian_email"
                            name="guardian_email"
                            type="email"
                            value={formData.guardian_email}
                            onChange={handleChange}
                            placeholder="tutor@ejemplo.com"
                            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        />
                        <p className="text-[10px] text-muted-foreground">Si el email coincide con un usuario existente, se vinculará automáticamente.</p>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-slate-500 hover:text-slate-700"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold border-none"
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
