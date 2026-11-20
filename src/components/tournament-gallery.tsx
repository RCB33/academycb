'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, Camera, Play, X } from 'lucide-react'
import { useLocale } from '@/lib/i18n/client'
import { tournamentGallery } from '@/lib/tournament-gallery'

const messages = {
  es: { eyebrow: 'Nuestros torneos, en imágenes', title: 'Un equipo. Mil recuerdos.', intro: 'Partidos, viajes y momentos compartidos defendiendo los colores de Academy Costa Brava.', all: 'Todo', photo: 'Fotos', video: 'Vídeos', more: 'Ver toda la galería', less: 'Mostrar menos', open: 'Ampliar foto', play: 'Reproducir vídeo', close: 'Cerrar galería', previous: 'Anterior', next: 'Siguiente', hint: 'Abre una foto para ampliarla o pulsa un vídeo para reproducirlo.', description: 'Galería de experiencias de torneo de Academy Costa Brava.', fallback: 'Abrir vídeo' },
  ca: { eyebrow: 'Els nostres tornejos, en imatges', title: 'Un equip. Mil records.', intro: 'Partits, viatges i moments compartits defensant els colors d’Academy Costa Brava.', all: 'Tot', photo: 'Fotos', video: 'Vídeos', more: 'Veure tota la galeria', less: 'Mostrar menys', open: 'Ampliar foto', play: 'Reproduir vídeo', close: 'Tancar galeria', previous: 'Anterior', next: 'Següent', hint: 'Obre una foto per ampliar-la o prem un vídeo per reproduir-lo.', description: 'Galeria d’experiències de torneig d’Academy Costa Brava.', fallback: 'Obrir vídeo' },
  en: { eyebrow: 'Our tournaments in pictures', title: 'One team. A thousand memories.', intro: 'Matches, journeys and shared moments representing Academy Costa Brava.', all: 'All', photo: 'Photos', video: 'Videos', more: 'View the full gallery', less: 'Show less', open: 'Enlarge photo', play: 'Play video', close: 'Close gallery', previous: 'Previous', next: 'Next', hint: 'Open a photo to enlarge it, or select a video to play it.', description: 'Gallery of Academy Costa Brava tournament experiences.', fallback: 'Open video' },
}

export function TournamentGallery() {
  const locale = useLocale(), t = messages[locale]
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const touch = useRef<number | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const items = tournamentGallery.filter(item => filter === 'all' || item.type === filter)
  const index = items.findIndex(item => item.id === selected)
  const active = items[index]
  const move = (offset: number) => setSelected(items[(index + offset + items.length) % items.length].id)
  const visible = expanded ? items : items.slice(0, 8)

  return <section id="galeria" aria-labelledby="tournament-gallery-title" className="scroll-mt-28 border-b border-white/10 bg-gradient-to-b from-navy to-navy-light/40 py-16 md:py-24">
    <div className="container">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-gold"><Camera className="h-5 w-5 shrink-0" aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="tournament-gallery-title" className="mt-4 font-heading text-4xl font-black uppercase leading-tight text-white md:text-6xl">{t.title}</h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-slate-300">{t.intro}</p>
      </div>
      <div className="my-8 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label={t.title} className="flex flex-wrap gap-2">
          {(['all', 'photo', 'video'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setExpanded(false) }} className={`min-h-11 rounded-full border px-5 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${filter === value ? 'border-gold bg-gold text-navy' : 'border-white/20 bg-white/5 text-white hover:border-gold'}`}>{t[value]} <span className="ml-1 opacity-70">{value === 'all' ? 17 : value === 'photo' ? 15 : 2}</span></button>)}
        </div>
        <p className="max-w-sm text-xs text-slate-400">{t.hint}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {visible.map(item => <button key={item.id} type="button" onClick={event => { opener.current = event.currentTarget; setSelected(item.id) }} aria-label={`${item.type === 'video' ? t.play : t.open}: ${item.title[locale]}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
          <Image src={item.preview} alt={item.title[locale]} fill unoptimized sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
          {item.type === 'video' && <><span className="absolute inset-0 flex items-center justify-center"><span className="rounded-full border border-white/40 bg-navy/75 p-3 text-gold backdrop-blur-sm"><Play className="h-6 w-6 fill-current" aria-hidden="true" /></span></span><span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">{item.duration}</span></>}
          <span className="absolute inset-x-0 bottom-0 p-3 text-xs font-semibold leading-snug text-white md:p-4 md:text-sm">{item.title[locale]}</span>
        </button>)}
      </div>
      {items.length > 8 && <div className="mt-8 text-center"><button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="min-h-12 rounded-xl border border-gold/60 px-7 py-3 text-sm font-bold text-gold transition hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">{expanded ? t.less : t.more}</button></div>}

      <Dialog.Root open={Boolean(active)} onOpenChange={open => { if (!open) setSelected(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm" />
          <Dialog.Content onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }} onKeyDown={event => { if (event.target instanceof HTMLVideoElement) return; if (event.key === 'ArrowRight') { event.preventDefault(); move(1) } if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) } }} className="fixed inset-x-3 top-1/2 z-[101] mx-auto max-w-6xl -translate-y-1/2 rounded-2xl border border-white/15 bg-navy p-3 text-white shadow-2xl sm:inset-x-6 sm:p-5">
            <div className="mb-3 flex min-h-11 items-center justify-between gap-3 pr-12">
              <Dialog.Title className="text-sm font-semibold sm:text-lg">{active?.title[locale]}</Dialog.Title>
              <span className="shrink-0 text-xs text-slate-400" aria-live="polite">{index + 1} / {items.length}</span>
            </div>
            <Dialog.Description className="sr-only">{t.description}</Dialog.Description>
            <Dialog.Close aria-label={t.close} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-gold"><X className="h-5 w-5" /></Dialog.Close>
            <div className="relative flex h-[60dvh] max-h-[720px] items-center justify-center bg-black sm:h-[70dvh]" onTouchStart={event => { touch.current = active?.type === 'photo' ? event.touches[0].clientX : null }} onTouchEnd={event => { if (touch.current !== null) { const distance = event.changedTouches[0].clientX - touch.current; if (Math.abs(distance) > 60) move(distance < 0 ? 1 : -1); touch.current = null } }}>
              {active?.type === 'photo' && <Image key={active.id} src={active.src} alt={active.title[locale]} fill unoptimized sizes="95vw" className="object-contain" />}
              {active?.type === 'video' && <video key={active.id} src={active.src} poster={active.preview} controls playsInline preload="none" className="h-full w-full object-contain" aria-label={active.title[locale]}><a href={active.src}>{t.fallback}</a></video>}
            </div>
            <div className="mt-3 flex justify-between gap-3"><button type="button" onClick={() => move(-1)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gold"><ArrowLeft className="h-5 w-5" />{t.previous}</button><button type="button" onClick={() => move(1)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gold">{t.next}<ArrowRight className="h-5 w-5" /></button></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  </section>
}
