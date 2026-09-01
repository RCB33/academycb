'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { CheckCircle2, ImagePlus, Loader2, LockKeyhole, Send, ShieldCheck, Sparkles, Video, X } from 'lucide-react'
import { createCommunityPost } from '@/app/actions/community-wall'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Child = { id: string; full_name: string; can_share_media: boolean }

const uploadableMedia: Record<string, { extension: string; mediaType: 'image' | 'video' }> = {
    'image/jpeg': { extension: 'jpg', mediaType: 'image' },
    'image/png': { extension: 'png', mediaType: 'image' },
    'image/webp': { extension: 'webp', mediaType: 'image' },
    'video/mp4': { extension: 'mp4', mediaType: 'video' },
    'video/webm': { extension: 'webm', mediaType: 'video' },
    'video/quicktime': { extension: 'mov', mediaType: 'video' },
}

export function CommunityComposer({ players }: { players: Child[] }) {
    const formRef = useRef<HTMLFormElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pending, startTransition] = useTransition()
    const [selectedChildId, setSelectedChildId] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [isError, setIsError] = useState(false)
    const [uploading, setUploading] = useState(false)
    const selectedChild = players.find((child) => child.id === selectedChildId)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null)
            return
        }
        const url = URL.createObjectURL(selectedFile)
        setPreviewUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [selectedFile])

    if (!players.length) return null

    function clearFile() {
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function selectFile(file: File | null) {
        setMessage(null)
        setIsError(false)
        if (!file) return
        if (!uploadableMedia[file.type] || file.size > 20 * 1024 * 1024) {
            setIsError(true)
            setMessage('Selecciona una imagen o vídeo válido de hasta 20 MB.')
            clearFile()
            return
        }
        setSelectedFile(file)
    }

    async function uploadSelectedMedia() {
        if (!selectedFile) return null
        const media = uploadableMedia[selectedFile.type]
        if (!media) throw new Error('Tipo de archivo no permitido.')
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Tu sesión ha caducado. Vuelve a entrar para compartir el archivo.')
        const path = `${user.id}/${crypto.randomUUID()}.${media.extension}`
        const { error: uploadError } = await supabase.storage.from('community-wall').upload(path, selectedFile, {
            contentType: selectedFile.type,
            cacheControl: '3600',
            upsert: false,
        })
        if (uploadError) throw new Error('No se pudo subir el archivo. Comprueba tu conexión e inténtalo de nuevo.')
        return { path, mediaType: media.mediaType, supabase }
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        // React libera el evento al terminar este manejador. Conservamos el formulario
        // antes de empezar la subida asíncrona para construir el FormData después.
        const form = event.currentTarget
        setMessage(null)
        setIsError(false)
        if (!selectedChildId) {
            setIsError(true)
            setMessage('Elige primero el jugador al que corresponde este logro.')
            return
        }
        if (selectedFile && !selectedChild?.can_share_media) {
            setIsError(true)
            setMessage('Para compartir foto o vídeo, activa primero el uso interno en Autorizaciones para este jugador.')
            return
        }

        startTransition(async () => {
            let uploaded: Awaited<ReturnType<typeof uploadSelectedMedia>> = null
            try {
                if (selectedFile) {
                    setUploading(true)
                    uploaded = await uploadSelectedMedia()
                }
                const formData = new FormData(form)
                if (uploaded) {
                    formData.set('media_path', uploaded.path)
                    formData.set('media_type', uploaded.mediaType)
                }
                const result = await createCommunityPost(formData)
                if (!result.success) {
                    if (uploaded) await uploaded.supabase.storage.from('community-wall').remove([uploaded.path])
                    setIsError(true)
                    setMessage(result.error || 'No se pudo publicar el logro.')
                    return
                }
                formRef.current?.reset()
                setSelectedChildId('')
                clearFile()
                setMessage('¡Logro compartido! Ya aparece en el Muro Academy.')
            } catch (error) {
                if (uploaded) await uploaded.supabase.storage.from('community-wall').remove([uploaded.path])
                setIsError(true)
                setMessage(error instanceof Error ? error.message : 'No se ha podido subir el archivo. Inténtalo de nuevo.')
            } finally {
                setUploading(false)
            }
        })
    }

    const isBusy = pending || uploading

    return <form ref={formRef} onSubmit={handleSubmit} className="overflow-hidden rounded-[1.75rem] border border-navy/10 bg-white shadow-xl shadow-navy/10">
        <div className="flex items-center gap-3 bg-navy px-5 py-4 text-white sm:px-6">
            <div className="rounded-2xl bg-gold p-2.5 text-navy shadow-lg shadow-black/15"><Sparkles className="h-5 w-5" /></div>
            <div><p className="font-heading text-xl font-black uppercase leading-none">Comparte un logro</p><p className="mt-1 text-xs text-slate-300">Un momento bonito para la comunidad Academy.</p></div>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
                <Textarea name="body" required minLength={2} maxLength={1500} className="min-h-24 resize-none border-0 bg-transparent px-2 py-1 text-base shadow-none focus-visible:ring-0" placeholder="¿Qué logro quieres celebrar hoy? Por ejemplo: gran torneo, primera convocatoria, esfuerzo en los entrenos…" />
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0] || null)} />
                    <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-xl px-3 text-navy hover:bg-gold/15 hover:text-navy"><ImagePlus className="mr-2 h-4 w-4 text-gold" />Foto o vídeo</Button>
                    <span className="text-xs text-slate-500">JPG, PNG, WEBP, MP4, WEBM o MOV · máx. 20 MB</span>
                </div>
            </div>

            {selectedFile && <div className="overflow-hidden rounded-2xl border border-gold/35 bg-gold/5">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-navy">
                        {uploadableMedia[selectedFile.type]?.mediaType === 'video' ? <Video className="h-4 w-4 shrink-0 text-gold" /> : <ImagePlus className="h-4 w-4 shrink-0 text-gold" />}
                        <span className="truncate">{selectedFile.name}</span>
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-slate-500 hover:bg-white hover:text-red-600" aria-label="Quitar adjunto" onClick={clearFile}><X className="h-4 w-4" /></Button>
                </div>
                {previewUrl && (uploadableMedia[selectedFile.type]?.mediaType === 'image' ? <img src={previewUrl} alt="Vista previa de la publicación" className="max-h-72 w-full object-cover" /> : <video src={previewUrl} controls className="max-h-72 w-full bg-navy" />)}
            </div>}

            <fieldset className="space-y-3">
                <legend className="text-sm font-black text-navy">¿De quién es este logro?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                    {players.map((child) => {
                        const active = child.id === selectedChildId
                        return <button key={child.id} type="button" onClick={() => { setSelectedChildId(child.id); setMessage(null); setIsError(false) }} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-gold bg-gold/10 ring-1 ring-gold/40' : 'border-slate-200 bg-white hover:border-gold/50'}`}>
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading font-black ${active ? 'bg-gold text-navy' : 'bg-navy/8 text-navy'}`}>{child.full_name.slice(0, 1).toUpperCase()}</span>
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-navy">{child.full_name}</span><span className={`mt-0.5 block text-xs ${child.can_share_media ? 'text-emerald-700' : 'text-slate-500'}`}>{child.can_share_media ? 'Foto y vídeo permitidos' : 'Solo publicación de texto'}</span></span>
                            {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />}
                        </button>
                    })}
                </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2"><label className="rounded-2xl border border-gold/45 bg-gold/10 p-3"><span className="flex items-center gap-2 text-sm font-bold text-navy"><input type="radio" name="visibility" value="community" defaultChecked className="accent-gold" />Comunidad Academy</span><span className="mt-1 block pl-6 text-xs text-slate-600">Lo ven las familias dentro del portal.</span></label><label className="rounded-2xl border border-slate-200 bg-white p-3"><span className="flex items-center gap-2 text-sm font-bold text-navy"><input type="radio" name="visibility" value="private" className="accent-gold" /><LockKeyhole className="h-3.5 w-3.5" />Solo mi familia</span><span className="mt-1 block pl-6 text-xs text-slate-600">Solo tu familia y Academy.</span></label></div>

            <div className="flex gap-2 rounded-xl border border-gold/25 bg-gold/5 p-3 text-xs leading-relaxed text-slate-600"><ShieldCheck className="h-4 w-4 shrink-0 text-gold" /><p>Academy puede retirar publicaciones para cuidar la comunidad. Las fotos y vídeos solo se permiten con la autorización interna activa.</p></div>
            {message && <p className={`rounded-xl px-3 py-2 text-sm font-medium ${isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`} role="status">{message}</p>}
            <Button disabled={isBusy} className="h-12 w-full rounded-xl bg-gold font-black text-navy shadow-lg shadow-gold/25 hover:bg-gold-light">{isBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{uploading ? 'Subiendo archivo…' : 'Publicando…'}</> : <><Send className="mr-2 h-4 w-4" />Compartir en el muro</>}</Button>
        </div>
    </form>
}
