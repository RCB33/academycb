"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
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
import { Plus, Upload, FileText, Loader2 } from "lucide-react"
import { uploadStudentDocument } from "@/app/actions/documents"
import { toast } from "sonner"

interface DocumentUploaderProps {
    childId: string
    onSuccess?: () => void
}

export function DocumentUploader({ childId, onSuccess }: DocumentUploaderProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [name, setName] = React.useState("")
    const [file, setFile] = React.useState<File | null>(null)

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("childId", childId)
        formData.append("name", name || file.name)

        const result = await uploadStudentDocument(formData)
        setLoading(false)

        if (result.success) {
            toast.success("Documento subido correctamente")
            setOpen(false)
            setName("")
            setFile(null)
            onSuccess?.()
        } else {
            toast.error(result.error || "Error al subir el documento")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> Subir Archivo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white border border-slate-200 shadow-xl">
                <DialogHeader>
                    <DialogTitle>Subir Nuevo Documento</DialogTitle>
                    <DialogDescription>
                        Añade un archivo al expediente del alumno (DNI, Ficha Médica, etc.)
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Documento</Label>
                        <Input
                            id="name"
                            placeholder="Ej: DNI Frontal, Ficha Médica..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="file">Archivo (PDF, JPG, PNG)</Label>
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 transition-colors cursor-pointer relative group">
                            <Input
                                id="file"
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                required
                            />
                            <div className="flex flex-col items-center gap-2">
                                {file ? (
                                    <>
                                        <FileText className="h-10 w-10 text-yellow-500" />
                                        <span className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{file.name}</span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-10 w-10 text-slate-300 group-hover:text-yellow-500 transition-colors" />
                                        <span className="text-sm font-medium text-slate-500">Arrastra o elige un archivo</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-11 transition-all shadow-md hover:shadow-lg"
                        disabled={loading || !file}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...
                            </>
                        ) : (
                            "Confirmar Subida"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
