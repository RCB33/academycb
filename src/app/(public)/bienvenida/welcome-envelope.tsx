'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MailOpen, Share2, ArrowRight, Check } from 'lucide-react'
export default function WelcomeEnvelope({ tournament }: { tournament: boolean }) {
    const [open, setOpen] = useState(false)
    const [shared, setShared] = useState(false)
    const title = tournament ? 'Torneo Academy' : 'Campus Navidad 2026–2027'
    async function share() {
        try {
            if (navigator.share) await navigator.share({ title: 'Mi bienvenida Academy · Muestra', text: 'Así es la bienvenida de Academy Costa Brava (muestra de diseño).', url: window.location.href })
            else { await navigator.clipboard.writeText(window.location.href); setShared(true) }
        } catch { /* Cancelling the share sheet does not change the card. */ }
    }
    return <div className="min-h-[85svh] overflow-hidden bg-navy px-4 py-12 text-white md:py-20">
        <div className="mx-auto max-w-2xl text-center">
            <p className="inline-block rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-bold text-gold">MUESTRA · Datos de ejemplo, sin inscripción real</p>
            <p className="mt-8 text-xs font-bold uppercase tracking-[.3em] text-gold">Una nueva historia con Academy</p>
            <h1 className="mt-4 font-heading text-5xl font-black uppercase md:text-7xl">El fútbol<br /><span className="text-gold">te espera.</span></h1>
            <p className="mx-auto mt-5 max-w-md text-slate-300">Hay una bienvenida especial para ti. Abre el sobre y descubre tu próxima experiencia.</p>
            {!open ? <button type="button" onClick={() => setOpen(true)} aria-label="Abrir sobre de bienvenida" className="group relative mx-auto mt-12 block aspect-[1.65] w-full max-w-lg overflow-hidden rounded-2xl border border-gold/40 bg-[#193960] shadow-2xl transition-transform hover:-translate-y-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold motion-reduce:transition-none">
                <span className="absolute inset-0 bg-[#23466f] [clip-path:polygon(0_0,50%_58%,100%_0)]" />
                <span className="absolute inset-0 bg-[#102c50] [clip-path:polygon(0_100%,50%_45%,100%_100%)]" />
                <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#ead385] bg-gold font-heading text-3xl font-black text-navy shadow-xl">ACB</span>
                <span className="absolute inset-x-0 bottom-5 text-xs font-bold uppercase tracking-[.2em] text-gold">Toca para abrir tu bienvenida</span>
            </button> : <article className="mt-10 overflow-hidden rounded-3xl border border-gold/40 bg-white text-navy shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-700" aria-live="polite">
                <div className="relative h-44 md:h-60"><Image src="/academy-group.jpg" alt="Jugadores de Academy Costa Brava" fill className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-navy to-transparent" /><span className="absolute bottom-5 left-6 rounded-full bg-gold px-4 py-2 text-xs font-black uppercase">Tu próxima experiencia</span></div>
                <div className="p-7 md:p-10"><MailOpen className="mx-auto h-9 w-9 text-amber-600" /><h2 className="mt-4 font-heading text-4xl font-black uppercase">¡Enhorabuena, Álex!</h2><p className="mt-4 text-lg">Ya formas parte de <strong>{title}</strong>.</p><p className="mt-3 leading-relaxed text-slate-600">Nuevos retos, nuevos amigos y muchos momentos con el balón. Tu historia con Academy empieza en el campo.</p>
                <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-7"><strong className="block">{title}</strong>{tournament ? <p>Fecha, categoría y sede de ejemplo por confirmar.</p> : <><p>22 diciembre — 7 enero · 09:00–14:00</p><p>Campo Municipal de Santa Cristina d’Aro</p></>}<p className="mt-2 text-xs text-amber-800">Esta tarjeta es una muestra, no un justificante de plaza ni de pago.</p></div>
                <button type="button" onClick={share} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gold px-6 font-bold">{shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}{shared ? 'Enlace copiado' : 'Compartir la muestra'}</button></div>
            </article>}
            <div className="mt-9 flex flex-wrap justify-center gap-5 text-sm"><Link href="/bienvenida" className="text-gold underline">Muestra campus</Link><Link href="/bienvenida?tipo=tournament" className="text-gold underline">Muestra torneo</Link><Link href={tournament ? '/torneos' : '/campus'} className="inline-flex items-center gap-1 text-slate-300">Ver la experiencia <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
    </div>
}
