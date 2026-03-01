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
import { Textarea } from "@/components/ui/textarea"
import { createGuardian, updateGuardian } from "@/app/actions/guardians"
import { toast } from "sonner"
import { Loader2, UserPlus, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

interface Props {
    mode: 'create' | 'edit'
    guardian?: any
    trigger?: React.ReactNode
    onUpdate?: () => void
}

export function GuardianDialog({ mode, guardian, trigger, onUpdate }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        full_name: guardian?.full_name || '',
        email: guardian?.email || '',
        phone: guardian?.phone || '',
        notes: guardian?.notes || ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (mode === 'create') {
                const result = await createGuardian(formData)
                if (result.success) {
                    toast.success("Tutor creado correctamente")
                    setOpen(false)
                    setFormData({ full_name: '', email: '', phone: '', notes: '' })
                    if (onUpdate) onUpdate()
                    router.refresh()
                } else {
                    toast.error(result.error || "Error al crear tutor")
                }
            } else {
                const result = await updateGuardian(guardian.id, formData)
                if (result.success) {
                    toast.success("Datos actualizados")
                    setOpen(false)
                    if (onUpdate) onUpdate()
                    router.refresh()
                } else {
                    toast.error(result.error || "Error al actualizar")
                }
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
                {trigger ? trigger : (
                    mode === 'create' ? (
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <UserPlus className="mr-2 h-4 w-4" /> Nuevo Tutor
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm">
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                    )
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Registrar Nuevo Tutor' : 'Editar Tutor'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create'
                            ? 'Añade los datos de contacto principales del tutor o responsable del alumno.'
                            : 'Modifica los datos de contacto de este tutor.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="full_name">Nombre Completo *</Label>
                        <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="Ej: Marcos Alonso"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="ejemplo@email.com"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+34 600 000 000"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notas Internas</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Instrucciones de cobro especial, horarios de contacto, etc."
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'create' ? 'Crear' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
