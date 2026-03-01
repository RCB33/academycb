'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { uploadImage, deleteImage } from '@/app/actions/gallery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface PhotoGalleryProps {
    childId: string
    initialImages: any[]
    canEdit: boolean
}

export function PhotoGallery({ childId, initialImages, canEdit }: PhotoGalleryProps) {
    const [isPending, startTransition] = useTransition()
    const [uploadOpen, setUploadOpen] = useState(false)

    async function handleUpload(formData: FormData) {
        startTransition(async () => {
            formData.append('childId', childId)
            const result = await uploadImage(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Imagen subida correctamente')
                setUploadOpen(false)
            }
        })
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Estás seguro de eliminar esta imagen?')) return

        startTransition(async () => {
            const result = await deleteImage(id, childId)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Imagen eliminada')
            }
        })
    }

    return (
        <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 flex flex-row items-center justify-between pb-8">
                <CardTitle className="flex items-center gap-2 text-white text-lg font-black uppercase">
                    <ImageIcon className="h-5 w-5 text-blue-500" />
                    Galería de Fotos
                </CardTitle>
                {canEdit && (
                    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg shadow-blue-900/20">
                                <Plus className="h-4 w-4 mr-2" />
                                Subir Foto
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Subir Foto</DialogTitle>
                                <DialogDescription>
                                    Selecciona una imagen para añadir a la galería del jugador.
                                </DialogDescription>
                            </DialogHeader>
                            <form action={handleUpload} className="space-y-4">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <input
                                        type="file"
                                        name="file"
                                        accept="image/*"
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Subiendo...
                                        </>
                                    ) : (
                                        'Subir Imagen'
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent className="bg-white rounded-t-2xl pt-6 -mt-4 min-h-[200px]">
                {initialImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                            <ImageIcon className="h-6 w-6 text-slate-200" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay fotos en la galería</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {initialImages.map((img) => (
                            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                <Image
                                    src={img.url}
                                    alt="Gallery image"
                                    fill
                                    className="object-cover transition-transform group-hover:scale-105"
                                />
                                {canEdit && (
                                    <button
                                        onClick={() => handleDelete(img.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
