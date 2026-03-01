'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Video, Link as LinkIcon, AlertCircle } from "lucide-react"
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
import { toast } from 'sonner'
import Image from 'next/image'

export function MediaAdminClient({ assets, categories }: { assets: MediaAsset[], categories: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        video_url: '',
        category_id: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.video_url || !formData.category_id) {
            toast.error("Por favor, rellena todos los campos obligatorios.")
            return
        }

        setIsSubmitting(true)
        const result = await createMediaAsset(formData)
        setIsSubmitting(false)

        if (result.success) {
            toast.success("Vídeo añadido correctamente")
            setIsOpen(false)
            setFormData({ title: '', description: '', video_url: '', category_id: '' })
        } else {
            toast.error(result.error)
        }
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

    // Attempt to extract YouTube ID for preview if the standard thumbnail failed or it's new
    const getYoutubeId = (url: string) => {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
        return match ? match[1] : null
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md">
                            <Plus className="mr-2 h-4 w-4" /> Añadir Vídeo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Video className="h-5 w-5 text-indigo-600" />
                                    Nuevo Recurso Multimedia
                                </DialogTitle>
                                <DialogDescription>
                                    Añade un enlace de YouTube o Vimeo para que las familias puedan verlo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="category">Categoría (Equipo) *</Label>
                                    <Select
                                        value={formData.category_id}
                                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el equipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories?.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Título *</Label>
                                    <Input
                                        id="title"
                                        placeholder="Ej: Resumen Partido contra FC Barcelona"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="font-medium"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="url">Enlace del Vídeo (URL) *</Label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="url"
                                            placeholder="https://youtube.com/watch?v=..."
                                            value={formData.video_url}
                                            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Descripción (Opcional)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Breve resumen o puntos destacados (min 12', gol de falta...)"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                    {isSubmitting ? 'Guardando...' : 'Guardar Vídeo'}
                                </Button>
                            </DialogFooter>
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
                            Añade el primer enlace de YouTube para empezar a crear la videoteca de tus equipos.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 select-none md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets.map((asset) => {
                        // Fallback logic for thumbnail if it didn't save correctly
                        const vId = getYoutubeId(asset.video_url);
                        const thumb = asset.thumbnail_url || (vId ? `https://img.youtube.com/vi/${vId}/maxresdefault.jpg` : null);

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
                                            {/* Fake play button overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="h-12 w-12 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-indigo-600/90 transition-all">
                                                    <div className="w-0 h-0 border-t-8 border-b-8 border-l-[14px] border-t-transparent border-b-transparent border-l-white ml-1"></div>
                                                </div>
                                            </div>
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
