'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { useLocale } from '@/lib/i18n/client'

const messages = {
    es: {
        heading: 'Academy en vídeo',
        more: 'Ver todos los vídeos', less: 'Mostrar menos vídeos',
        fallback: 'Abrir vídeo',
        titles: ['Coordinación y agilidad', 'Nuestra forma de entrenar', 'Trabajo técnico', 'Entrenamiento en el campo', 'Entrenamiento de porteros', 'Control y finalización', 'Momentos Academy', 'Fútbol en equipo', 'Técnica con balón', 'Aprender juntos', 'Coordinación con balón'],
    },
    ca: {
        heading: 'Academy en vídeo',
        more: 'Veure tots els vídeos', less: 'Mostrar menys vídeos',
        fallback: 'Obrir vídeo',
        titles: ['Coordinació i agilitat', 'La nostra manera d’entrenar', 'Treball tècnic', 'Entrenament al camp', 'Entrenament de porters', 'Control i finalització', 'Moments Academy', 'Futbol en equip', 'Tècnica amb pilota', 'Aprendre junts', 'Coordinació amb pilota'],
    },
    en: {
        heading: 'Academy in video',
        more: 'View all videos', less: 'Show fewer videos',
        fallback: 'Open video',
        titles: ['Coordination and agility', 'The way we train', 'Technical training', 'Training on the pitch', 'Goalkeeper training', 'Control and finishing', 'Academy moments', 'Team football', 'Ball skills', 'Learning together', 'Coordination with the ball'],
    },
}

export function AcademyVideos() {
    const t = messages[useLocale()]
    const [expanded, setExpanded] = useState(false)

    return <section className="mb-10 border-b border-white/10 pb-10" aria-labelledby="academy-videos-title">
        <h3 id="academy-videos-title" className="mb-5 flex items-center gap-2 px-2 font-heading text-2xl font-bold text-white"><Play aria-hidden="true" className="h-5 w-5 text-gold" />{t.heading}</h3>
        <div id="academy-video-list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.titles.slice(0, expanded ? t.titles.length : 3).map((title, index) => {
                const path = `/academia/galeria/video-${String(index + 1).padStart(2, '0')}`
                return <figure key={path} className="overflow-hidden rounded-2xl border border-white/10 bg-navy-light">
                    <video controls playsInline preload="none" poster={`${path}-portada.webp`} aria-label={title} className="aspect-[3/4] w-full bg-black object-contain">
                        <source src={`${path}.mp4`} type="video/mp4" />
                        <a href={`${path}.mp4`}>{t.fallback}: {title}</a>
                    </video>
                    <figcaption className="px-4 py-3 text-sm font-semibold text-white">{title}</figcaption>
                </figure>
            })}
        </div>
        <div className="mt-6 text-center">
            <button type="button" aria-expanded={expanded} aria-controls="academy-video-list" onClick={() => setExpanded(value => !value)} className="min-h-12 rounded-xl border border-gold/40 bg-gold/10 px-6 py-3 text-sm font-bold text-gold transition hover:bg-gold/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                {expanded ? t.less : `${t.more} (${t.titles.length})`}
            </button>
        </div>
    </section>
}
