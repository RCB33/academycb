'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Video, Link as LinkIcon, Upload, FileVideo } from "lucide-react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MediaAsset, createMediaAsset, deleteMediaAsset } from '@/app/actions/media'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Image from 'next/image'

type UploadMode = 'url' | 'file'

export function MediaAdminClient({ assets, categories }: { assets: MediaAsset[], categories: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadMode, setUploadMode] = useState<UploadMode>('url')
    const [uploadProgress, setUploadProgress] = useState(0)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        video_url: '',
        category_id: ''
    })

    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.category_id) {
            toast.error("Por favor, rellena el título y la categoría.")
            return
        }

        setIsSubmitting(true)

        try {
            if (uploadMode === 'file' && selectedFile) {
                // Upload file to Supabase Storage 
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
                const filePath = `uploads/${fileName}`

                setUploadProgress(10)

                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('videos')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) {
                    console.error("Upload error:", uploadError)
                    toast.error("Error al subir el archivo: " + uploadError.message)
                    setIsSubmitting(false)
                    setUploadProgress(0)
                    return
                }

                setUploadProgress(80)

                // Get public URL
                const { data: urlData } = supabase
                    .storage
                    .from('videos')
                    .getPublicUrl(filePath)

                const publicUrl = urlData.publicUrl

                // Create media asset with the storage URL
                const result = await createMediaAsset({
                    ...formData,
                    video_url: publicUrl
                })

                setUploadProgress(100)

                if (result.success) {
                    toast.success("Vídeo subido correctamente")
                    resetForm()
                } else {
                    toast.error(result.error)
                }
            } else {
                // Regular URL mode
                if (!formData.video_url) {
                    toast.error("Por favor, introduce la URL del vídeo.")
                    setIsSubmitting(false)
                    return
                }

                const result = await createMediaAsset(formData)
                if (result.success) {
                    toast.success("Vídeo añadido correctamente")
                    resetForm()
                } else {
                    toast.error(result.error)
                }
            }
        } catch (err) {
            console.error(err)
            toast.error("Error inesperado")
        } finally {
            setIsSubmitting(false)
            setUploadProgress(0)
        }
    }

    const resetForm = () => {
        setIsOpen(false)
        setFormData({ title: '', description: '', video_url: '', category_id: '' })
        setSelectedFile(null)
        setUploadMode('url')
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar este vídeo?')) return
        const result = await deleteMediaAsset(id)
        if (result.success) {
            toast.success("Vídeo eliminado")
        } else {
            toast.error(result.error)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Check file size (max 500MB)
            if (file.size > 500 * 1024 * 1024) {
                toast.error("El archivo es demasiado grande. Máximo 500MB.")
                return
            }
            setSelectedFile(file)
            // Auto-fill title from filename if empty
            if (!formData.title) {
                const name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
                setFormData(prev => ({ ...prev, title: name }))
            }
        }
    }

    // Attempt to extract YouTube ID for preview
    const getYoutubeId = (url: string) => {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
        return match ? match[1] : null
    }

    const isStorageUrl = (url: string) => {
        return url.includes('supabase') && url.includes('storage')
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm() }}>
                    <DialogTrigger asChild>
                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md">
                            <Plus className="mr-2 h-4 w-4" /> Añadir Vídeo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] p-0 border-0 overflow-hidden bg-slate-50 sm:rounded-2xl">
                        {/* Header */}
                        <div className="bg-yellow-500 p-5 flex flex-col items-center">
                            <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                                <Video className="h-6 w-6 text-black" />
                            </div>
                            <DialogTitle className="text-lg font-black text-black tracking-tight uppercase">
                                Nuevo Vídeo
                            </DialogTitle>
                            <DialogDescription className="text-black/60 text-xs mt-1">
                                Sube un archivo o pega un enlace de YouTube/Vimeo
                            </DialogDescription>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Upload mode toggle */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('url')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-bold transition-all
                                        ${uploadMode === 'url'
                                            ? 'bg-white shadow-sm text-slate-900'
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    Enlace URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('file')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-bold transition-all
                                        ${uploadMode === 'file'
                                            ? 'bg-white shadow-sm text-slate-900'
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    Subir Archivo
                                </button>
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Categoría (Equipo) *</Label>
                                <Select
                                    value={formData.category_id}
                                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Selecciona el equipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Título *</Label>
                                <Input
                                    placeholder="Ej: Resumen Partido contra FC Barcelona"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="bg-white font-medium"
                                />
                            </div>

                            {/* URL or File upload */}
                            {uploadMode === 'url' ? (
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Enlace del Vídeo (URL) *</Label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="https://youtube.com/watch?v=..."
                                            value={formData.video_url}
                                            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                                            className="pl-9 bg-white"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Archivo de Vídeo *</Label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    {selectedFile ? (
                                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-green-200">
                                            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                                                <FileVideo className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                                                <p className="text-[10px] text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-400 hover:text-red-500"
                                                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full p-6 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:border-yellow-400 hover:bg-yellow-50/30 transition-all flex flex-col items-center gap-2 group"
                                        >
                                            <div className="h-12 w-12 rounded-full bg-slate-100 group-hover:bg-yellow-100 flex items-center justify-center transition-colors">
                                                <Upload className="h-5 w-5 text-slate-400 group-hover:text-yellow-600 transition-colors" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-500 group-hover:text-slate-700">Haz clic para seleccionar un vídeo</p>
                                            <p className="text-[10px] text-slate-400">MP4, MOV, AVI • Máximo 500 MB</p>
                                        </button>
                                    )}

                                    {/* Upload progress */}
                                    {isSubmitting && uploadProgress > 0 && (
                                        <div className="space-y-1">
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 text-right">{uploadProgress}%</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Descripción (Opcional)</Label>
                                <Textarea
                                    placeholder="Breve resumen o puntos destacados..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="bg-white resize-none"
                                />
                            </div>

                            {/* Submit */}
                            <div className="pt-2 flex justify-end gap-3 border-t">
                                <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-black hover:bg-slate-800 text-white font-bold px-6"
                                >
                                    {isSubmitting
                                        ? (uploadMode === 'file' ? 'Subiendo...' : 'Guardando...')
                                        : (uploadMode === 'file' ? 'Subir Vídeo' : 'Guardar Vídeo')
                                    }
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {assets.length === 0 ? (
                <Card className="border-dashed shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                            <Video className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No hay vídeos subidos</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            Añade un enlace de YouTube o sube un archivo de vídeo para empezar a crear la videoteca de tus equipos.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 select-none md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets.map((asset) => {
                        const vId = getYoutubeId(asset.video_url);
                        const thumb = asset.thumbnail_url || (vId ? `https://img.youtube.com/vi/${vId}/maxresdefault.jpg` : null);
                        const isFile = isStorageUrl(asset.video_url);

                        return (
                            <Card key={asset.id} className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all group">
                                <div className="relative aspect-video bg-slate-900">
                                    {thumb ? (
                                        <div className="w-full h-full relative opacity-90 group-hover:opacity-100 transition-opacity">
                                            <Image
                                                src={thumb}
                                                alt={asset.title}
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <a
                                                    href={asset.video_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-12 w-12 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-yellow-500/90 transition-all"
                                                >
                                                    <div className="w-0 h-0 border-t-8 border-b-8 border-l-[14px] border-t-transparent border-b-transparent border-l-white ml-1"></div>
                                                </a>
                                            </div>
                                        </div>
                                    ) : isFile ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                            <FileVideo className="h-10 w-10 text-yellow-500 mb-2" />
                                            <Badge className="bg-yellow-500/20 text-yellow-400 border-none text-[9px] uppercase font-bold tracking-widest">
                                                Archivo Local
                                            </Badge>
                                            <a
                                                href={asset.video_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40"
                                            >
                                                <div className="h-12 w-12 bg-yellow-500 rounded-full flex items-center justify-center">
                                                    <div className="w-0 h-0 border-t-8 border-b-8 border-l-[14px] border-t-transparent border-b-transparent border-l-black ml-1"></div>
                                                </div>
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <Video className="h-12 w-12 text-slate-700" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <Badge className="bg-black/60 backdrop-blur-md text-white border-white/10 font-bold">
                                            {asset.categories?.name || 'General'}
                                        </Badge>
                                    </div>
                                    {isFile && (
                                        <div className="absolute top-2 left-2">
                                            <Badge className="bg-yellow-500 text-black border-none font-bold text-[9px]">
                                                <Upload className="h-2.5 w-2.5 mr-1" />
                                                Subido
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4 relative">
                                    <div className="pr-8">
                                        <h3 className="font-bold text-slate-900 line-clamp-2 leading-tight mb-1">{asset.title}</h3>
                                        {asset.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                {asset.description}
                                            </p>
                                        )}
                                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-3">
                                            {new Date(asset.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="absolute bottom-4 right-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            onClick={() => handleDelete(asset.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
