'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Camera, Play, X } from 'lucide-react'
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
  const visible = expanded ? items : items.slice(0, 7)
  const counts = { all: tournamentGallery.length, photo: tournamentGallery.filter(item => item.type === 'photo').length, video: tournamentGallery.filter(item => item.type === 'video').length }
  const titleParts = t.title.split('.').filter(Boolean)

  return <section id="galeria" aria-labelledby="tournament-gallery-title" className="relative isolate scroll-mt-28 overflow-hidden border-y border-white/10 bg-[#071725] py-16 md:py-24">
    <div aria-hidden="true" className="pointer-events-none absolute -right-48 -top-64 -z-10 h-[650px] w-[650px] rounded-full bg-[#235780]/20 blur-[110px]" />
    <div className="container">
      <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end lg:gap-16">
        <div>
          <p className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.22em] text-gold sm:text-xs"><span className="h-px w-8 bg-gold" />{t.eyebrow}</p>
          <h2 id="tournament-gallery-title" className="mt-5 font-heading text-[clamp(2.2rem,5vw,4.6rem)] font-black uppercase leading-[1.02] tracking-tight text-white"><span className="block">{titleParts[0]}.</span><span className="block text-gold">{titleParts[1]?.trim()}.</span></h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-slate-400 lg:pb-1 lg:text-base">{t.intro}</p>
      </div>
      <div className="mb-6 mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 md:mb-8 md:mt-12">
        <div role="group" aria-label={t.title} className="inline-flex gap-1 rounded-full border border-white/10 bg-white/[.03] p-1">
          {(['all', 'photo', 'video'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setExpanded(false) }} className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition sm:px-5 sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${filter === value ? 'bg-gold text-navy shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>{t[value]} <span className="text-[10px] tabular-nums opacity-60">{counts[value]}</span></button>)}
        </div>
        <span aria-hidden="true" className="hidden items-center gap-2 text-xs text-slate-500 md:flex"><Camera className="h-4 w-4" />Academy Costa Brava <span className="mx-1 text-gold/50">/</span> {counts.all}</span>
      </div>
      <div className={`grid grid-cols-2 items-stretch gap-3 md:gap-4 ${filter === 'video' ? 'mx-auto max-w-3xl' : 'lg:grid-cols-4'}`}>
        {visible.map((item, position) => {
          const featured = position === 0 && item.type === 'photo'
          return <button key={item.id} type="button" onClick={event => { opener.current = event.currentTarget; setSelected(item.id) }} aria-label={`${item.type === 'video' ? t.play : t.open}: ${item.title[locale]}`} className={`group relative isolate overflow-hidden rounded-xl bg-white/5 text-left ring-1 ring-inset ring-white/10 transition-shadow hover:shadow-[0_12px_45px_-15px_rgba(0,0,0,.7)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${featured ? 'col-span-2 aspect-[3/2]' : 'aspect-[3/4]'} md:rounded-2xl`}>
          <Image src={featured ? item.src : item.preview} alt={item.title[locale]} fill unoptimized sizes={featured ? '(max-width: 1023px) 100vw, 50vw' : '(max-width: 1023px) 50vw, 25vw'} className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]" />
          <span className={`absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent transition-opacity ${featured || item.type === 'video' ? 'opacity-90' : 'opacity-50 group-hover:opacity-90 group-focus-visible:opacity-90'}`} />
          {item.type === 'video' ? <><span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-md md:left-4 md:top-4"><span className="h-1 w-1 rounded-full bg-gold" />{t.video} · {item.duration}</span><span className="absolute inset-0 flex items-center justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-white/15 text-white shadow-xl backdrop-blur-md transition group-hover:scale-110 group-hover:bg-gold group-hover:text-navy md:h-16 md:w-16"><Play className="ml-1 h-5 w-5 fill-current" aria-hidden="true" /></span></span></> : <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/15 text-white opacity-0 backdrop-blur-md transition group-hover:opacity-100 group-focus-visible:opacity-100"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>}
          <span className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-white md:p-5 ${featured ? 'text-lg font-semibold md:p-7 md:text-2xl' : 'text-xs font-medium md:text-sm'}`}><span className={featured || item.type === 'video' ? '' : 'transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100'}>{item.title[locale]}</span>{featured && <ArrowUpRight className="mb-1 h-5 w-5 shrink-0" aria-hidden="true" />}</span>
        </button>})}
      </div>
      <div className="mt-7 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-7 sm:flex-row">
        <p className="max-w-xs text-center text-xs leading-relaxed text-slate-500 sm:text-left">{t.hint}</p>
        {items.length > 7 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="group flex min-h-12 items-center gap-4 rounded-full border border-white/20 bg-white/[.03] py-2 pl-6 pr-2 text-sm font-semibold text-white transition hover:border-gold/60 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">{expanded ? t.less : t.more}<span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-navy"><ArrowDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} /></span></button>}
      </div>

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
