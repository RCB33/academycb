'use client'
import { useEffect, useState, useTransition } from 'react'
import { useT } from '@/lib/i18n/client'
import { uploadImage, deleteImage, getPlayerGallery } from '@/app/actions/gallery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type GalleryImage = { id: string; url: string; title?: string; canDelete?: boolean }
export function PhotoGallery({ childId, initialImages, canEdit }: { childId: string; initialImages: GalleryImage[]; canEdit: boolean }) {
    const t = useT()
    const [images,setImages] = useState(initialImages)
    const [pending,start] = useTransition()
    const [uploadOpen,setUploadOpen] = useState(false)
    const [selected,setSelected] = useState<string | null>(null)
    const [error,setError] = useState('')
    useEffect(()=>setImages(initialImages),[initialImages])
    const index = images.findIndex(image=>image.id===selected), current = images[index]
    const move = (delta:number) => setSelected(images[(index+delta+images.length)%images.length]?.id || null)
    const reload = async () => setImages(await getPlayerGallery(childId))
    return <Card className="overflow-hidden border-none bg-white shadow-xl">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 bg-slate-900 pb-8">
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase text-white"><ImageIcon className="h-5 w-5 text-gold" />{t('Galería de Fotos')}</CardTitle>
            {canEdit && <Button onClick={()=>{setError('');setUploadOpen(true)}} className="bg-gold font-bold text-navy hover:bg-gold-light"><Plus className="mr-2 h-4 w-4" />{t('Subir Foto')}</Button>}
        </CardHeader>
        <CardContent className="relative -mt-4 min-h-48 rounded-t-2xl bg-white pt-6">
            <p className="mb-4 text-xs text-slate-500">{t('Fotos privadas del jugador. Toca una imagen para verla completa.')}</p>
            {error && !uploadOpen && <p role="alert" className="mb-4 text-sm text-red-700">{t(error)}</p>}
            {!images.length ? <p className="py-12 text-center text-sm text-slate-500">{t('No hay fotos en la galería')}</p> : <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {images.map((img,i)=><div key={img.id} className="relative overflow-hidden rounded-xl border bg-slate-100">
                    <button type="button" className="block aspect-square w-full focus-visible:outline-4 focus-visible:outline-gold" aria-label={`${t('Ampliar foto')} ${i+1}`} onClick={()=>setSelected(img.id)}>
                        <img src={img.url} alt={img.title || `${t('Foto del jugador')} ${i+1}`} loading="lazy" className="h-full w-full object-cover" />
                    </button>
                    {canEdit && img.canDelete && <button type="button" disabled={pending} aria-label={`${t('Eliminar foto')} ${i+1}`} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-red-700 shadow" onClick={()=>{
                        if(!confirm(t('¿Estás seguro de eliminar esta imagen?')))return
                        setError('');start(async()=>{try{const result=await deleteImage(img.id,childId);if(result.error)setError(result.error);else await reload()}catch{setError('No se pudo eliminar la foto.')}})
                    }}><Trash2 className="h-4 w-4" /></button>}
                </div>)}
            </div>}
        </CardContent>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}><DialogContent><DialogHeader><DialogTitle>{t('Subir Foto')}</DialogTitle><DialogDescription>{t('Solo para la familia de este jugador y Academy. JPG, PNG o WebP, máximo 3 MB.')}</DialogDescription></DialogHeader>
            <form className="space-y-4" action={form=>{setError('');start(async()=>{try{form.set('childId',childId);const result=await uploadImage(form);if(result.error)setError(result.error);else{await reload();setUploadOpen(false)}}catch{setError('No se pudo subir la foto.')}})}}>
                <label className="block space-y-2 text-sm font-semibold"><span>{t('Seleccionar foto')}</span><input required type="file" name="file" accept="image/jpeg,image/png,image/webp" className="block w-full rounded-lg border p-2" /></label>
                {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}
                <Button disabled={pending} className="w-full">{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t(pending?'Subiendo...':'Subir Imagen')}</Button>
            </form>
        </DialogContent></Dialog>
        <Dialog open={!!current} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="max-h-[95dvh] overflow-y-auto sm:max-w-4xl" onKeyDown={event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}if(event.key==='ArrowRight'){event.preventDefault();move(1)}}}>
            <DialogHeader><DialogTitle>{t('Foto del jugador')} {index+1} / {images.length}</DialogTitle><DialogDescription>{t('Galería privada')}</DialogDescription></DialogHeader>
            {current && <img src={current.url} alt={current.title || t('Foto del jugador')} className="max-h-[65dvh] w-full rounded-lg object-contain" />}
            {images.length>1 && <div className="flex justify-between gap-3"><Button variant="outline" onClick={()=>move(-1)}><ChevronLeft className="mr-1 h-4 w-4" />{t('Anterior')}</Button><Button variant="outline" onClick={()=>move(1)}>{t('Siguiente')}<ChevronRight className="ml-1 h-4 w-4" /></Button></div>}
        </DialogContent></Dialog>
    </Card>
}

export function ManagedPlayerGallery({childId}:{childId:string}) {
    const [images,setImages]=useState<GalleryImage[] | null>(null),[error,setError]=useState('')
    useEffect(()=>{let active=true;getPlayerGallery(childId).then(data=>{if(active)setImages(data)}).catch(()=>{if(active)setError('No se pudo cargar la galería.')});return()=>{active=false}},[childId])
    if(error)return <p role="alert">{error}</p>
    if(!images)return <p className="p-6 text-sm text-slate-500">Cargando galería…</p>
    return <PhotoGallery childId={childId} initialImages={images} canEdit />
}
