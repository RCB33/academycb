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
import { Loader2, UserPlus, Pencil, Key } from "lucide-react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"

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
        notes: guardian?.notes || '',
        createPortalAccount: false
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
                    setFormData({ full_name: '', email: '', phone: '', notes: '', createPortalAccount: false })
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
                        <Button className="bg-[#0C2241] hover:bg-[#1a365d] text-white">
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
                    {mode === 'create' && (
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
                    )}
                    {mode === 'create' && (
                        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4 bg-muted/50">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Key className="w-4 h-4 text-emerald-600" />
                                    Activar acceso al Portal Familias
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Si lo activas y tiene email, se le creará cuenta con la contraseña <code className="bg-slate-200 px-1 rounded">CostaBrava2026</code>.
                                </p>
                            </div>
                            <Switch
                                checked={formData.createPortalAccount}
                                onCheckedChange={(checked) => setFormData({ ...formData, createPortalAccount: checked })}
                                disabled={!formData.email}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-[#0C2241] hover:bg-[#1a365d] text-white">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'create' ? 'Crear' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
