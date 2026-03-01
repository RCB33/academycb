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
import { updateStudentData } from "@/app/actions/students"
import { toast } from "sonner"
import { Pencil, Loader2 } from "lucide-react"

import { useRouter } from "next/navigation"

export function EditStudentDialog({ student, guardian, categories, onUpdate }: { student: any, guardian: any, categories: any[], onUpdate?: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // Form State
    const [formData, setFormData] = useState({
        full_name: student.full_name,
        birth_date: student.birth_date || '',
        address: student.address || '',
        category_id: student.category_id,
        guardian_id: guardian?.id,
        guardian_name: guardian?.full_name || '',
        guardian_phone: guardian?.phone || '',
        guardian_email: guardian?.email || '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await updateStudentData(student.id, formData)
            if (result.success) {
                toast.success("Datos actualizados correctamente")
                setOpen(false)
                if (onUpdate) {
                    onUpdate()
                }
                router.refresh()
            } else {
                toast.error("Error al actualizar: " + result.error)
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
                <Button size="sm" className="hidden lg:flex bg-yellow-500 hover:bg-yellow-600 text-black font-bold border-none shadow-md">
                    <Pencil className="mr-2 h-4 w-4" /> Editar Datos
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-0 shadow-2xl">
                <div className="bg-slate-900 px-6 py-4">
                    <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-yellow-500" />
                        Editar Ficha del Alumno
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Modifica los datos personales y de contacto.
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6 grid gap-6">

                    <div className="space-y-4">
                        <h3 className="font-semibold text-xs text-yellow-600 uppercase tracking-wider border-b border-yellow-100 pb-2">Datos del Alumno</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2 col-span-2">
                                <Label htmlFor="full_name" className="text-slate-700">Nombre Completo</Label>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    required
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
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="category_id" className="text-slate-700">Categoría</Label>
                                <select
                                    id="category_id"
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:bg-white transition-colors"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2 col-span-2">
                                <Label htmlFor="address" className="text-slate-700">Dirección Completa</Label>
                                <Input
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Calle, Número, Ciudad..."
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-xs text-yellow-600 uppercase tracking-wider border-b border-yellow-100 pb-2">Datos del Tutor Principal</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2 col-span-2">
                                <Label htmlFor="guardian_name" className="text-slate-700">Nombre del Tutor</Label>
                                <Input
                                    id="guardian_name"
                                    name="guardian_name"
                                    value={formData.guardian_name}
                                    onChange={handleChange}
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="guardian_phone" className="text-slate-700">Teléfono</Label>
                                <Input
                                    id="guardian_phone"
                                    name="guardian_phone"
                                    value={formData.guardian_phone}
                                    onChange={handleChange}
                                    type="tel"
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="guardian_email" className="text-slate-700">Email</Label>
                                <Input
                                    id="guardian_email"
                                    name="guardian_email"
                                    value={formData.guardian_email}
                                    onChange={handleChange}
                                    type="email"
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-2">
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
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
