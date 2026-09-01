'use client'

import { useState } from 'react'
import { Heart, Play, Plus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type CommunityStory = {
    id: string
    author: string
    body: string
    createdAt: string
    mediaUrl: string | null
    mediaType: 'image' | 'video' | null
}

export function CommunityStories({ stories }: { stories: CommunityStory[] }) {
    const [activeId, setActiveId] = useState<string | null>(null)
    const active = stories.find((story) => story.id === activeId)

    return <>
        <section className="rounded-[1.6rem] border border-navy/10 bg-white px-4 py-5 shadow-lg shadow-navy/5 sm:px-5" aria-labelledby="stories-title">
            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">La comunidad al día</p><h2 id="stories-title" className="mt-1 font-heading text-xl font-black uppercase text-navy">Últimas publicaciones</h2></div><span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-bold text-navy">{stories.length} {stories.length === 1 ? 'historia' : 'historias'}</span></div>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
                <button type="button" onClick={() => document.getElementById('compartir-logro')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="group flex w-[72px] shrink-0 flex-col items-center gap-2 text-center"><span className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-dashed border-gold bg-gold/10 text-gold transition group-hover:scale-105 group-hover:bg-gold group-hover:text-navy"><Plus className="h-7 w-7" /></span><span className="line-clamp-2 text-xs font-bold leading-tight text-navy">Compartir</span></button>
                {stories.map((story) => <button key={story.id} type="button" onClick={() => setActiveId(story.id)} className="group flex w-[72px] shrink-0 flex-col items-center gap-2 text-center"><span className="relative h-[72px] w-[72px] overflow-hidden rounded-full bg-gradient-to-br from-gold via-gold to-navy p-[3px] shadow-md transition group-hover:scale-105"><span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-navy text-xl font-black text-gold">{story.mediaUrl && story.mediaType === 'image' ? <img src={story.mediaUrl} alt="" className="h-full w-full object-cover" /> : story.mediaType === 'video' ? <Play className="h-6 w-6 fill-gold text-gold" /> : story.author.slice(0, 1).toUpperCase()}</span>{story.mediaType && <span className="absolute bottom-0.5 right-0.5 rounded-full border-2 border-white bg-navy p-1 text-gold">{story.mediaType === 'video' ? <Play className="h-2.5 w-2.5 fill-gold" /> : <Heart className="h-2.5 w-2.5 fill-gold" />}</span>}</span><span className="line-clamp-2 text-xs font-bold leading-tight text-navy">{story.author}</span></button>)}
            </div>
        </section>

        {active && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Publicación de ${active.author}`} onClick={() => setActiveId(null)}><article className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between bg-navy px-5 py-4 text-white"><div className="flex items-center gap-2"><span className="rounded-xl bg-gold p-2 text-navy"><Sparkles className="h-4 w-4" /></span><div><p className="font-bold">{active.author}</p><p className="text-xs text-slate-300">{new Date(active.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p></div></div><Button type="button" size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setActiveId(null)} aria-label="Cerrar historia"><X className="h-5 w-5" /></Button></div>{active.mediaUrl && (active.mediaType === 'image' ? <img src={active.mediaUrl} alt="Publicación de la comunidad" className="max-h-[64vh] w-full object-contain bg-navy" /> : <video src={active.mediaUrl} controls autoPlay className="max-h-[64vh] w-full bg-navy" />)}<p className="whitespace-pre-wrap p-5 text-[15px] leading-relaxed text-slate-700">{active.body}</p></article></div>}
    </>
}
