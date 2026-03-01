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
import { useState, useRef, useEffect } from "react"
import { createWorker, updateWorker, uploadWorkerAvatar } from "@/app/actions/workers"
import { toast } from "sonner"
import { Loader2, Plus, Upload, Camera, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface WorkerDialogProps {
    mode: 'create' | 'edit'
    worker?: any
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function WorkerDialog({ mode, worker, trigger, open, onOpenChange }: WorkerDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [color, setColor] = useState(worker?.color || 'blue')
    const [avatarUrl, setAvatarUrl] = useState(worker?.avatar_url || null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isControlled = open !== undefined && onOpenChange !== undefined
    const isOpen = isControlled ? open : internalOpen
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen

    // Sync state when dialog opens or worker changes
    useEffect(() => {
        if (isOpen) {
            setColor(worker?.color || 'blue')
            setAvatarUrl(worker?.avatar_url || null)
            setSelectedFile(null)
        }
    }, [isOpen, worker])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (mode === 'edit' && worker?.id) {
            // Direct upload for existing worker
            setIsUploading(true)
            const formData = new FormData()
            formData.append('file', file)
            formData.append('workerId', worker.id)

            try {
                const res = await uploadWorkerAvatar(formData)
                if (res.success) {
                    setAvatarUrl(res.url)
                    toast.success("Foto actualizada")
                } else {
                    toast.error("Error al subir foto")
                }
            } catch (err) {
                toast.error("Error de conexión")
            }
            setIsUploading(false)
        } else {
            // Preview for new worker (upload later)
            setSelectedFile(file)
            setAvatarUrl(URL.createObjectURL(file))
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            full_name: formData.get('full_name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            position: formData.get('position') as string,
            color: color,
            avatar_url: avatarUrl || undefined // Pass URL if it exists
        }

        try {
            let res;
            if (mode === 'create') {
                res = await createWorker(data) as any
            } else {
                res = await updateWorker(worker.id, data)
            }

            if (res.success) {
                // If we have a selected file pending upload (Create mode)
                if (mode === 'create' && selectedFile && res.id) {
                    const uploadFormData = new FormData()
                    uploadFormData.append('file', selectedFile)
                    uploadFormData.append('workerId', res.id)
                    await uploadWorkerAvatar(uploadFormData) // Upload in background
                }

                toast.success(mode === 'create' ? "Miembro añadido correctamente" : "Datos actualizados")
                setIsOpen(false)
                // Cleanup temp URL
                if (selectedFile && avatarUrl) URL.revokeObjectURL(avatarUrl)
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
            <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl">
                <div className="bg-yellow-500 p-6 flex flex-col items-center">
                    <DialogTitle className="text-2xl font-black text-black tracking-tight uppercase mb-2">
                        {mode === 'create' ? 'Nuevo Fichaje' : 'Editar Ficha'}
                    </DialogTitle>

                    {/* Avatar Upload UI */}
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Avatar className="h-24 w-24 border-4 border-black/10 shadow-xl bg-white">
                            <AvatarImage src={avatarUrl || ""} className="object-cover" />
                            <AvatarFallback className="bg-slate-100 text-slate-300">
                                <User className="h-10 w-10" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                    </div>
                    {mode === 'create' && !selectedFile && (
                        <p className="text-xs font-bold text-black/50 mt-2 uppercase tracking-wide">Click para subir foto</p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Nombre Completo</Label>
                        <Input name="full_name" defaultValue={worker?.full_name} required className="bg-white" placeholder="Ej. Carlos López" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Cargo / Posición</Label>
                            <Input name="position" defaultValue={worker?.position} required className="bg-white" placeholder="Ej. Entrenador" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Color Etiqueta</Label>
                            <div className="flex gap-2 pt-1">
                                {['blue', 'red', 'green', 'yellow', 'purple', 'black'].map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-black scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                        style={{ backgroundColor: c === 'black' ? '#1e293b' : c === 'yellow' ? '#eab308' : c === 'red' ? '#ef4444' : c === 'green' ? '#22c55e' : c === 'purple' ? '#a855f7' : '#3b82f6' }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Email</Label>
                        <Input name="email" type="email" defaultValue={worker?.email} className="bg-white" placeholder="correo@academia.com" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Teléfono</Label>
                        <Input name="phone" defaultValue={worker?.phone} className="bg-white" placeholder="+34 600 000 000" />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-black hover:bg-slate-800 text-white font-bold w-full sm:w-auto">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {mode === 'create' ? 'Fichar' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
