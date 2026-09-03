import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, CheckCircle2, ExternalLink, MapPin, Target, Trophy, Users } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

function formatDateRange(start: string | null, end: string | null) {
    if (!start) return 'Fechas próximamente'
    const formatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    const startLabel = formatter.format(new Date(`${start}T12:00:00`))
    if (!end || end === start) return startLabel
    return `${startLabel} – ${formatter.format(new Date(`${end}T12:00:00`))}`
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: tournament } = await supabase
        .from('tournaments_internal')
        .select('id,title,start_date,end_date,location,price,capacity,status,external_url,image_url,public_summary,experience_type,categories,birth_years,competitive_level,tournament_format,included_services,preparation_info,travel_info,additional_info')
        .eq('id', id)
        .in('status', ['coming_soon', 'open', 'closed'])
        .maybeSingle()

    if (!tournament) notFound()

    const details = [
        { label: 'Categorías', value: tournament.categories, icon: Users },
        { label: 'Años de nacimiento', value: tournament.birth_years, icon: CalendarDays },
        { label: 'Nivel competitivo', value: tournament.competitive_level, icon: Target },
        { label: 'Formato', value: tournament.tournament_format, icon: Trophy },
    ].filter((detail) => detail.value)

    const informationBlocks = [
        { title: 'Qué incluye la experiencia', content: tournament.included_services },
        { title: 'Entrenamientos previos', content: tournament.preparation_info },
        { title: 'Viaje y alojamiento', content: tournament.travel_info },
        { title: 'Información adicional', content: tournament.additional_info },
    ].filter((block) => block.content)

    return (
        <div className="min-h-screen bg-navy text-white">
            <section className="relative flex min-h-[58svh] items-end overflow-hidden">
                <Image src={tournament.image_url || '/academy-gallery-6.jpg'} alt={tournament.title} fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/65 to-navy/35" />
                <div className="container relative z-10 py-16 md:py-20">
                    <Link href="/torneos#proximos-torneos" className="inline-flex items-center text-sm font-bold text-slate-200 transition hover:text-gold"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a torneos</Link>
                    <div className="mt-8 max-w-4xl"><span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${tournament.status === 'open' ? 'bg-emerald-500 text-white' : tournament.status === 'closed' ? 'bg-slate-500 text-white' : 'bg-gold text-navy'}`}>{tournament.status === 'open' ? 'Inscripciones abiertas' : tournament.status === 'closed' ? 'Inscripciones cerradas' : 'Próximamente'}</span><h1 className="mt-4 font-heading text-4xl font-black uppercase leading-[.92] text-white sm:text-5xl md:text-7xl">{tournament.title}</h1><p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-gold">{tournament.experience_type || 'Experiencia Academy'}</p></div>
                </div>
            </section>

            <main className="container py-16 md:py-24">
                <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
                    <div>
                        {tournament.public_summary && <p className="max-w-3xl text-xl leading-relaxed text-slate-200 md:text-2xl">{tournament.public_summary}</p>}

                        {details.length > 0 && <section className="mt-10 grid gap-4 sm:grid-cols-2">{details.map((detail) => <article key={detail.label} className="rounded-2xl border border-white/10 bg-white/[.045] p-5"><detail.icon className="h-6 w-6 text-gold" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{detail.label}</p><p className="mt-2 font-bold text-white">{detail.value}</p></article>)}</section>}

                        {informationBlocks.length > 0 ? <section className="mt-12 space-y-5">{informationBlocks.map((block) => <article key={block.title} className="rounded-3xl border border-white/10 bg-navy-light/65 p-6 md:p-8"><h2 className="font-heading text-2xl font-black uppercase text-white">{block.title}</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-slate-300">{block.content}</p></article>)}</section> : <section className="mt-12 rounded-3xl border border-dashed border-gold/30 bg-white/[.04] p-8"><h2 className="font-heading text-2xl font-black uppercase text-white">Información en preparación</h2><p className="mt-3 leading-relaxed text-slate-300">Academy está preparando las categorías, el formato y todos los detalles de esta experiencia.</p></section>}
                    </div>

                    <aside className="h-fit rounded-3xl border border-gold/30 bg-gold p-6 text-navy shadow-2xl shadow-black/20 lg:sticky lg:top-24">
                        <h2 className="font-heading text-2xl font-black uppercase">Información principal</h2>
                        <div className="mt-6 space-y-4 text-sm"><p className="flex gap-3"><CalendarDays className="h-5 w-5 shrink-0" /><span><strong className="block">Fechas</strong>{formatDateRange(tournament.start_date, tournament.end_date)}</span></p>{tournament.location && <p className="flex gap-3"><MapPin className="h-5 w-5 shrink-0" /><span><strong className="block">Lugar</strong>{tournament.location}</span></p>}<p className="flex gap-3"><Users className="h-5 w-5 shrink-0" /><span><strong className="block">Aforo previsto</strong>{tournament.capacity} plazas</span></p>{Number(tournament.price) > 0 && <p className="border-t border-navy/20 pt-4"><strong className="block text-xs uppercase tracking-wider">Precio por plaza</strong><span className="font-heading text-4xl font-black">{Number(tournament.price).toFixed(2)} €</span></p>}</div>
                        {tournament.status === 'open' ? <Button asChild className="mt-7 w-full bg-navy font-bold text-white hover:bg-navy/90"><Link href={`/inscripcion?service=tournament&activity=${tournament.id}`}>Solicitar plaza</Link></Button> : <Button asChild className="mt-7 w-full bg-navy font-bold text-white hover:bg-navy/90"><Link href="/contacto">Quiero recibir información</Link></Button>}
                        {tournament.external_url && <Button asChild variant="outline" className="mt-3 w-full border-navy/25 bg-white/30 font-bold text-navy hover:bg-white/50"><a href={tournament.external_url} target="_blank" rel="noopener noreferrer">Web del torneo <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                        <p className="mt-5 flex gap-2 text-xs leading-relaxed text-navy/70"><CheckCircle2 className="h-4 w-4 shrink-0" /> Secretaría confirmará disponibilidad y siguientes pasos.</p>
                    </aside>
                </div>
            </main>
        </div>
    )
}
