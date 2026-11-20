'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useLocale } from '@/lib/i18n/client'

const messages = {
    es: { photo: 'Foto de Academy Costa Brava', open: 'Ampliar foto', close: 'Cerrar galería', previous: 'Anterior', next: 'Siguiente', more: 'Ver todas las fotos', less: 'Mostrar menos', title: 'Galería de momentos', description: 'Entrenamientos, partidos y momentos compartidos en Academy Costa Brava.' },
    ca: { photo: 'Foto d’Academy Costa Brava', open: 'Ampliar foto', close: 'Tancar galeria', previous: 'Anterior', next: 'Següent', more: 'Veure totes les fotos', less: 'Mostrar menys', title: 'Galeria de moments', description: 'Entrenaments, partits i moments compartits a Academy Costa Brava.' },
    en: { photo: 'Academy Costa Brava photo', open: 'Enlarge photo', close: 'Close gallery', previous: 'Previous', next: 'Next', more: 'View all photos', less: 'Show less', title: 'Gallery of moments', description: 'Training, matches and shared moments at Academy Costa Brava.' },
}

const photos = [
    ...Array.from({ length: 28 }, (_, index) => {
        const path = `/academia/galeria/foto-${String(index + 1).padStart(2, '0')}`
        return { src: `${path}.webp`, preview: `${path}-mini.webp` }
    }),
    ...Array.from({ length: 9 }, (_, index) => ({ src: `/academy-gallery-${index + 1}.jpg`, preview: `/academy-gallery-${index + 1}.jpg` })),
]

export function AcademyGallery() {
    const t = messages[useLocale()]
    const [expanded, setExpanded] = useState(false)
    const [selected, setSelected] = useState<number | null>(null)
    const opener = useRef<HTMLButtonElement | null>(null)
    const touchStart = useRef<number | null>(null)
    const active = selected === null ? null : photos[selected]
    const move = (offset: number) => setSelected(index => index === null ? null : (index + offset + photos.length) % photos.length)

    return <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {(expanded ? photos : photos.slice(0, 8)).map((photo, index) => <button
                key={photo.src}
                type="button"
                aria-label={`${t.open} ${index + 1}`}
                onClick={event => { opener.current = event.currentTarget; setSelected(index) }}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-navy-light transition hover:border-gold/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
                <Image src={photo.preview} alt={`${t.photo} ${index + 1}`} fill unoptimized sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw" className="object-contain transition-transform duration-300 motion-safe:group-hover:scale-[1.02]" />
            </button>)}
        </div>
        <div className="mt-8 text-center">
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="min-h-12 rounded-xl border border-gold/40 bg-gold/10 px-6 py-3 text-sm font-bold text-gold transition hover:bg-gold/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                {expanded ? t.less : `${t.more} (${photos.length})`}
            </button>
        </div>
        <Dialog.Root open={active !== null} onOpenChange={open => { if (!open) setSelected(null) }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-navy p-3 text-white shadow-2xl sm:p-5"
                    onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}
                    onKeyDown={event => {
                        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
                        if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
                    }}
                >
                    <div className="mb-3 flex items-center justify-between gap-4">
                        <Dialog.Title className="font-heading text-lg font-bold">{t.title} · {selected === null ? '' : selected + 1} / {photos.length}</Dialog.Title>
                        <Dialog.Close aria-label={t.close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-gold"><X className="h-5 w-5" /></Dialog.Close>
                    </div>
                    <Dialog.Description className="sr-only">{t.description}</Dialog.Description>
                    <div className="relative h-[65svh] bg-black/30" onTouchStart={event => { touchStart.current = event.touches[0].clientX }} onTouchEnd={event => {
                        if (touchStart.current !== null) {
                            const distance = event.changedTouches[0].clientX - touchStart.current
                            if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1)
                        }
                        touchStart.current = null
                    }}>
                        {active && <Image key={active.src} src={active.src} alt={`${t.photo} ${(selected ?? 0) + 1}`} fill unoptimized sizes="100vw" className="object-contain" />}
                    </div>
                    <div className="mt-3 flex justify-between gap-3">
                        <button type="button" onClick={() => move(-1)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gold"><ChevronLeft className="h-5 w-5" />{t.previous}</button>
                        <button type="button" onClick={() => move(1)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gold">{t.next}<ChevronRight className="h-5 w-5" /></button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    </>
}
