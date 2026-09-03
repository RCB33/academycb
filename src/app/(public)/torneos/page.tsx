import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Brain, CalendarDays, ExternalLink, HeartHandshake, MapPin, ShieldCheck, Sparkles, Target, Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPublicSettings } from '@/lib/public-settings'
import { Button } from '@/components/ui/button'

export const metadata = {
    title: 'Torneos Academy',
    description: 'Torneos regionales, nacionales e internacionales con Academy Costa Brava.'
}

const formationValues = [
    { title: 'Compite', text: 'Aprender a decidir y dar lo mejor bajo presión.', icon: Target },
    { title: 'Aprende', text: 'Gestionar la victoria, la derrota y cada nuevo reto.', icon: Brain },
    { title: 'Comparte', text: 'Respeto, empatía y compañerismo por encima del resultado.', icon: HeartHandshake },
]

const participationLines = [
    { title: 'Alta exigencia', text: 'Convocatorias para contextos competitivos exigentes.', icon: Trophy },
    { title: 'Diferentes niveles', text: 'Experiencias adaptadas a edades y momentos distintos.', icon: Users },
    { title: 'Preparación Academy', text: 'Entrenamientos previos para conocer al equipo y al cuerpo técnico.', icon: ShieldCheck },
]

const periods = [
    { key: 'navidad', title: 'Navidad', subtitle: 'Diciembre 2026 · Enero 2027' },
    { key: 'semana_santa', title: 'Semana Santa', subtitle: 'Marzo 2027' },
    { key: 'verano', title: 'Verano', subtitle: 'Julio 2027' },
    { key: 'otro', title: 'Otras fechas', subtitle: 'Nuevas experiencias Academy' },
]

function formatDateRange(start: string | null, end: string | null) {
    if (!start) return 'Fechas próximamente'
    const formatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' })
    const startLabel = formatter.format(new Date(`${start}T12:00:00`))
    if (!end || end === start) return startLabel
    return `${startLabel} – ${formatter.format(new Date(`${end}T12:00:00`))}`
}

export default async function TorneosPage() {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)
    const [{ data }, settings] = await Promise.all([
        supabase
            .from('tournaments_internal')
            .select('id,title,start_date,end_date,location,price,capacity,status,image_url,public_summary,season_period,experience_type')
            .in('status', ['coming_soon', 'open'])
            .or(`end_date.is.null,end_date.gte.${today}`)
            .order('start_date', { ascending: true, nullsFirst: false }),
        getPublicSettings()
    ])
    const tournaments = data || []
    const resultsUrl = settings.tournaments_url || ''

    return (
        <div className="min-h-screen bg-navy text-white">
            <section className="relative flex min-h-[72svh] items-center overflow-hidden">
                <Image src="/academy-gallery-6.jpg" alt="Jugadores de Academy Costa Brava unidos antes de competir" fill className="object-cover object-center" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/45" />
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-navy to-transparent" />
                <div className="container relative z-10 py-24">
                    <div className="max-w-4xl">
                        <p className="inline-flex items-center rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gold backdrop-blur"><Trophy className="mr-2 h-4 w-4" /> Torneos Academy</p>
                        <h1 className="mt-7 font-heading text-4xl font-black uppercase leading-[.9] text-white sm:text-5xl md:text-8xl">Competir, aprender<br /><span className="text-gold">y vivir la experiencia.</span></h1>
                        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-200 md:text-2xl">La competición forma parte del crecimiento. Cada torneo es fútbol, convivencia y aprendizaje dentro y fuera del campo.</p>
                        <Button asChild size="lg" className="mt-9 min-h-14 bg-gold px-7 font-bold uppercase text-navy hover:bg-gold-light"><Link href="#proximos-torneos">Ver próximos torneos <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
                    </div>
                </div>
            </section>

            <section className="container py-20 md:py-28">
                <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Nuestra forma de competir</p><h2 className="mt-3 font-heading text-4xl font-black uppercase text-white md:text-6xl">El resultado importa.<br /><span className="text-gold">La formación, más.</span></h2><p className="mt-6 text-base leading-relaxed text-slate-300 md:text-lg">Queremos competir, mejorar y darlo todo. Y hacerlo con respeto, buen comportamiento y los valores que representan a Academy Costa Brava.</p></div>
                <div className="mt-12 grid gap-4 md:grid-cols-3">{formationValues.map((item) => <article key={item.title} className="rounded-3xl border border-white/10 bg-white/[.045] p-6 text-center transition hover:-translate-y-1 hover:border-gold/50"><item.icon className="mx-auto h-8 w-8 text-gold" /><h3 className="mt-5 font-heading text-3xl font-black uppercase text-white">{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-300">{item.text}</p></article>)}</div>
            </section>

            <section className="border-y border-white/10 bg-navy-light/45 py-20 md:py-28">
                <div className="container grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
                    <div className="relative min-h-[23rem] overflow-hidden rounded-[2rem] border border-gold/25 shadow-2xl shadow-black/30 md:min-h-[30rem]"><Image src="/academy-gallery-1.jpg" alt="Equipo Academy celebrando su experiencia en un torneo" fill className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent" /><p className="absolute bottom-6 left-6 right-6 font-heading text-3xl font-black uppercase text-white">Una identidad.<br /><span className="text-gold">Una familia.</span></p></div>
                    <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Diferentes experiencias</p><h2 className="mt-3 font-heading text-4xl font-black uppercase leading-tight text-white md:text-6xl">Un torneo para<br /><span className="text-gold">cada jugador.</span></h2><p className="mt-5 text-base leading-relaxed text-slate-300 md:text-lg">Participamos en competiciones regionales, nacionales e internacionales. Algunas convocatorias también se abren a jugadores externos que quieran representar a Academy y conocer nuestra forma de competir.</p><div className="mt-7 space-y-3">{participationLines.map((item) => <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.045] p-4"><item.icon className="mt-0.5 h-6 w-6 shrink-0 text-gold" /><div><h3 className="font-bold text-white">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-400">{item.text}</p></div></div>)}</div></div>
                </div>
            </section>

            <section className="container py-20 md:py-28">
                <div className="rounded-[2rem] border border-gold/25 bg-gradient-to-br from-gold/10 to-white/[.03] p-7 md:p-10"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Nuestra experiencia</p><h2 className="mt-2 font-heading text-3xl font-black uppercase text-white md:text-5xl">Crecemos temporada<br /><span className="text-gold">tras temporada.</span></h2></div><div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">{[{ number: '+20', label: 'Torneos disputados', icon: Trophy }, { number: '+50', label: 'Equipos participantes', icon: Users }, { number: '≈1.000', label: 'Participaciones de jugadores', icon: Sparkles }, { number: '3', label: 'Ámbitos', detail: 'Regional · Nacional · Internacional', icon: MapPin }].map((item) => <article key={item.label} className="rounded-3xl border border-white/10 bg-navy/60 p-5 text-center shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:border-gold/50 md:p-7"><item.icon className="mx-auto h-7 w-7 text-gold" /><p className="mt-4 font-heading text-4xl font-black leading-none text-gold md:text-6xl">{item.number}</p><h3 className="mt-4 text-xs font-bold uppercase leading-relaxed tracking-wide text-white md:text-sm">{item.label}</h3>{item.detail && <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.detail}</p>}</article>)}</div></div>
            </section>

            <section id="proximos-torneos" className="scroll-mt-24 border-y border-white/10 bg-navy-light/40 py-20 md:py-28">
                <div className="container">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Temporada 2026/27</p><h2 className="mt-3 font-heading text-4xl font-black uppercase text-white md:text-6xl">Próximos <span className="text-gold">torneos.</span></h2></div><p className="max-w-md text-sm leading-relaxed text-slate-300">Consulta la información principal y entra en cada ficha para conocer todos los detalles disponibles.</p></div>

                    {tournaments.length > 0 ? <div className="mt-12 space-y-14">{periods.map((period) => {
                        const periodTournaments = tournaments.filter((tournament) => tournament.season_period === period.key || (period.key === 'otro' && !tournament.season_period))
                        if (periodTournaments.length === 0) return null
                        return <div key={period.key}><div className="mb-5 flex items-center gap-4"><CalendarDays className="h-6 w-6 text-gold" /><div><h3 className="font-heading text-3xl font-black uppercase text-white">{period.title}</h3><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{period.subtitle}</p></div></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{periodTournaments.map((tournament) => <article key={tournament.id} className="group overflow-hidden rounded-3xl border border-white/10 bg-navy shadow-xl shadow-black/15 transition hover:-translate-y-1 hover:border-gold/50"><div className="relative aspect-[16/9] overflow-hidden"><Image src={tournament.image_url || '/academy-gallery-6.jpg'} alt={tournament.title} fill className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent" /><span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${tournament.status === 'open' ? 'bg-emerald-500 text-white' : 'bg-gold text-navy'}`}>{tournament.status === 'open' ? 'Inscripciones abiertas' : 'Próximamente'}</span></div><div className="p-6"><p className="text-xs font-bold uppercase tracking-[0.15em] text-gold">{tournament.experience_type || 'Experiencia Academy'}</p><h4 className="mt-2 font-heading text-3xl font-black uppercase text-white">{tournament.title}</h4><div className="mt-4 space-y-2 text-sm text-slate-300"><p className="flex gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-gold" />{formatDateRange(tournament.start_date, tournament.end_date)}</p>{tournament.location && <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-gold" />{tournament.location}</p>}</div>{tournament.public_summary && <p className="mt-4 text-sm leading-relaxed text-slate-400">{tournament.public_summary}</p>}<div className="mt-6 flex flex-col gap-2 sm:flex-row"><Button asChild variant="outline" className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href={`/torneos/${tournament.id}`}>Más información</Link></Button>{tournament.status === 'open' && <Button asChild className="flex-1 bg-gold font-bold text-navy hover:bg-gold-light"><Link href={`/inscripcion?service=tournament&activity=${tournament.id}`}>Solicitar plaza</Link></Button>}</div></div></article>)}</div></div>
                    })}</div> : <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-dashed border-gold/35 bg-white/[.045] p-10 text-center"><Trophy className="mx-auto h-10 w-10 text-gold" /><h3 className="mt-5 text-2xl font-bold">Nuevas experiencias próximamente</h3><p className="mt-3 text-slate-300">Publicaremos aquí las próximas convocatorias cuando estén confirmadas.</p><Button asChild className="mt-6 bg-gold font-bold text-navy"><Link href="/contacto">Recibir información</Link></Button></div>}

                    {resultsUrl && <div className="mt-12 text-center"><Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><a href={resultsUrl} target="_blank" rel="noopener noreferrer">Portal de resultados <ExternalLink className="ml-2 h-4 w-4" /></a></Button></div>}
                </div>
            </section>

            <section className="container py-20 text-center md:py-28"><p className="font-heading text-4xl font-black uppercase text-white md:text-6xl">Los resultados pasan.<br /><span className="text-gold">Los recuerdos permanecen.</span></p><p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">Está en los compañeros, los lugares, los rivales y las dificultades que aprendemos a superar juntos.</p><Button asChild size="lg" className="mt-8 bg-gold px-7 font-bold uppercase text-navy hover:bg-gold-light"><Link href="/contacto">Quiero vivir la experiencia</Link></Button></section>
        </div>
    )
}
