import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, Footprints, Gamepad2, MapPin, Medal, MoonStar, Sparkles, Sun, Trophy, Users, Waves } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export const metadata = {
    title: 'Campus de fútbol',
    description: 'Campus de fútbol, convivencia y actividades de Academy Costa Brava.'
}

const experience = [
    { title: 'Entrena', text: 'Sesiones de fútbol adaptadas a cada grupo y edad.', icon: Footprints },
    { title: 'Juega', text: 'Juegos, retos y dinámicas para aprender divirtiéndose.', icon: Gamepad2 },
    { title: 'Compite', text: 'Partidos, campeonatos y formatos de competición.', icon: Trophy },
    { title: 'Comparte', text: 'Nuevas amistades, convivencia y respeto en equipo.', icon: Users },
    { title: 'Disfruta', text: 'Actividades especiales que hacen única cada edición.', icon: Sun },
]

const vacationPeriods = [
    { title: 'Navidad', text: 'Seguir jugando y compartir unos días diferentes con amigos.', icon: MoonStar },
    { title: 'Semana Santa', text: 'Fútbol, juegos y convivencia para unas vacaciones activas.', icon: Sparkles },
    { title: 'Verano', text: 'La experiencia más completa: fútbol, agua, excursiones y mucho más.', icon: Sun },
]

const winterDay = [
    ['09:00', 'Llegada'],
    ['09:15 – 10:30', 'Entrenamiento'],
    ['10:30 – 11:00', 'Almuerzo y descanso'],
    ['11:00 – 12:30', 'Juegos y actividades'],
    ['12:30 – 13:00', 'Partidos y campeonatos'],
]

const summerDay = [
    ['09:00', 'Llegada'],
    ['09:15 – 10:30', 'Entrenamiento'],
    ['10:30 – 11:00', 'Almuerzo y descanso'],
    ['11:00 – 12:00', 'Juegos y actividades'],
    ['12:00 – 13:00', 'Piscina o juegos de agua'],
    ['13:00 – 14:00', 'Partidos y campeonatos'],
]

function Timeline({ entries }: { entries: string[][] }) {
    return <ol className="space-y-4">{entries.map(([time, activity], index) => <li key={`${time}-${activity}`} className="relative grid grid-cols-[7.75rem_1fr] gap-4 pl-7 text-sm sm:grid-cols-[9rem_1fr]">
        {index < entries.length - 1 && <span className="absolute bottom-[-1rem] left-[0.65rem] top-7 w-px bg-gold/35" />}
        <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-gold bg-navy" />
        <time className="font-heading font-bold text-gold">{time}</time>
        <span className="font-medium text-slate-200">{activity}</span>
    </li>)}</ol>
}

export default async function CampusPage() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('campuses')
        .select('id, name, start_date, end_date, capacity, price')
        .eq('status', 'published')
        .gte('end_date', new Date().toISOString().slice(0, 10))
        .order('start_date')

    const campuses = data || []
    const firstCampus = campuses[0]

    return (
        <div className="min-h-screen bg-navy text-white">
            <section className="relative flex min-h-[78svh] items-center overflow-hidden">
                <Image src="/campus-hero-new.png" alt="Participantes de Campus Academy Costa Brava" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/75 to-navy/25" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy to-transparent" />
                <div className="container relative z-10 py-24">
                    <div className="max-w-3xl">
                        <p className="inline-flex items-center rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gold backdrop-blur"><Sun className="mr-2 h-4 w-4" /> Campus Academy Costa Brava</p>
                        <h1 className="mt-7 font-heading text-5xl font-black uppercase leading-[.88] text-white md:text-8xl">Fútbol, diversión<br /><span className="text-gold">y experiencias</span><br />para recordar.</h1>
                        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-200 md:text-2xl">Campus para disfrutar de las vacaciones jugando, aprendiendo y compartiendo mucho más que fútbol.</p>
                        <p className="mt-6 font-heading text-sm font-bold tracking-[0.16em] text-gold uppercase">Navidad · Semana Santa · Verano</p>
                        <Button asChild size="lg" className="mt-9 min-h-14 bg-gold px-7 font-bold uppercase text-navy hover:bg-gold-light"><Link href="#proximo-campus">Descubre el próximo campus</Link></Button>
                    </div>
                </div>
            </section>

            <section className="container py-20 md:py-28">
                <div className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
                    <div className="relative min-h-[22rem] overflow-hidden rounded-[2rem] border border-gold/25 shadow-2xl shadow-black/25 md:min-h-[31rem]">
                        <Image src="/campus-summer-kids.jpg" alt="Niños disfrutando del Campus Academy" fill className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
                        <p className="absolute bottom-6 left-6 right-6 font-heading text-3xl font-black uppercase leading-tight text-white">Mucho más<br /><span className="text-gold">que fútbol</span></p>
                    </div>
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Una experiencia diferente</p>
                        <h2 className="mt-3 font-heading text-4xl font-black uppercase leading-tight text-white md:text-6xl">Jugar, aprender<br />y <span className="text-gold">disfrutar.</span></h2>
                        <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-300 md:text-lg">
                            <p>Los Campus Academy Costa Brava mantienen nuestra filosofía formativa con un enfoque diferente a la tecnificación: el fútbol se convierte en una herramienta para jugar, aprender y disfrutar.</p>
                            <p>Combinamos entrenamientos adaptados con juegos, competiciones y actividades lúdicas para que los jugadores hagan amigos, compartan experiencias y aprovechen sus vacaciones.</p>
                        </div>
                        <p className="mt-7 rounded-2xl border border-gold/30 bg-gold/10 p-5 font-heading text-xl font-black uppercase leading-tight text-white">Que cada niño llegue con ganas de jugar y termine el día <span className="text-gold">con ganas de volver.</span></p>
                    </div>
                </div>
            </section>

            <section className="border-y border-white/10 bg-navy-light/45 py-20 md:py-28">
                <div className="container">
                    <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Nuestra experiencia de Campus</p><h2 className="mt-3 font-heading text-4xl font-black uppercase text-white md:text-6xl">Cinco formas de<br /><span className="text-gold">vivir el campus.</span></h2></div>
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {experience.map((item) => <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[.045] p-5 transition hover:-translate-y-1 hover:border-gold/50 hover:bg-white/[.08]"><item.icon className="h-7 w-7 text-gold" /><h3 className="mt-5 font-heading text-2xl font-bold uppercase text-white">{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-300">{item.text}</p></article>)}
                    </div>
                </div>
            </section>

            <section className="container py-20 md:py-28">
                <div className="grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
                    <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Cada edición es diferente</p><h2 className="mt-3 font-heading text-4xl font-black uppercase text-white md:text-6xl">Recuerdos que van<br /><span className="text-gold">más allá del campo.</span></h2><p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">Además del fútbol, organizamos momentos especiales según la edición y la época del año: Aquadiver, playa, piscina, juegos de agua, acampadas, gymkanas, excursiones y actividades especiales.</p><p className="mt-4 text-sm text-slate-400">El programa puede variar en cada edición.</p></div>
                    <div className="grid grid-cols-2 gap-4"><div className="relative col-span-2 aspect-[16/8] overflow-hidden rounded-3xl border border-gold/25"><Image src="/campus-beach.jpg" alt="Actividad exterior de Campus Academy" fill className="object-cover" /></div><div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10"><Image src="/academy-group.jpg" alt="Grupo de jugadores Academy" fill className="object-cover" /></div><div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10"><Image src="/academy-session.jpg" alt="Juego y entrenamiento Academy" fill className="object-cover" /></div></div>
                </div>
            </section>

            <section className="bg-gold py-20 text-navy md:py-28">
                <div className="container"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-navy/70">Un campus para cada vacación</p><h2 className="mt-3 font-heading text-4xl font-black uppercase md:text-6xl">Todo el año para<br />seguir disfrutando.</h2><p className="mt-5 text-base leading-relaxed text-navy/80 md:text-lg">De 4 a 14 años. Los grupos se organizan por edades para adaptar las actividades y dinámicas a cada etapa.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3">{vacationPeriods.map((period) => <article key={period.title} className="rounded-3xl border border-navy/15 bg-white/45 p-6"><period.icon className="h-8 w-8" /><h3 className="mt-5 font-heading text-3xl font-black uppercase">{period.title}</h3><p className="mt-3 text-sm leading-relaxed text-navy/75">{period.text}</p></article>)}</div></div>
            </section>

            <section className="container py-20 md:py-28"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Así es un día en nuestro campus</p><h2 className="mt-3 font-heading text-4xl font-black uppercase text-white md:text-6xl">Un ritmo para<br /><span className="text-gold">vivirlo todo.</span></h2></div><div className="mt-12 grid gap-6 lg:grid-cols-2"><article className="rounded-3xl border border-white/10 bg-white/[.045] p-6 md:p-8"><div className="mb-7 flex items-center gap-3"><MoonStar className="h-7 w-7 text-gold" /><div><h3 className="font-heading text-3xl font-black uppercase">Navidad y Semana Santa</h3><p className="mt-1 text-sm text-slate-400">Una jornada llena de fútbol y juegos.</p></div></div><Timeline entries={winterDay} /></article><article className="rounded-3xl border border-gold/30 bg-navy-light p-6 md:p-8"><div className="mb-7 flex items-center gap-3"><Waves className="h-7 w-7 text-gold" /><div><h3 className="font-heading text-3xl font-black uppercase">Campus de Verano</h3><p className="mt-1 text-sm text-slate-400">Con piscina o juegos de agua según edición.</p></div></div><Timeline entries={summerDay} /></article></div><p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-slate-400">Durante la jornada se realizan las pausas necesarias según las edades y actividades.</p></section>

            <section className="border-y border-white/10 bg-navy-light/50 py-20"><div className="container"><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Pensado para ellos</p><h2 className="mt-3 font-heading text-4xl font-black uppercase text-white md:text-5xl">Tranquilidad<br /><span className="text-gold">para las familias.</span></h2></div><div className="grid gap-3 sm:grid-cols-2">{['De 4 a 14 años', 'Grupos organizados por edades', 'Máximo aproximado: 1 monitor por cada 10 niños', 'Acogida de 08:00 a 09:00', 'Comedor disponible según edición', 'Actividades adaptadas a cada época del año'].map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-4 text-sm font-semibold text-slate-200"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" />{item}</div>)}</div></div></div></section>

            <section className="container py-20"><div className="rounded-[2rem] border border-gold/25 bg-gradient-to-br from-gold/10 to-white/[.03] p-7 md:p-10"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Nuestros campus en números</p><h2 className="mt-2 font-heading text-3xl font-black uppercase text-white md:text-5xl">Una experiencia que sigue creciendo<br /><span className="text-gold">edición tras edición.</span></h2></div><div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">{[{ number: '+10', label: 'Ediciones realizadas', icon: CalendarDays }, { number: '+500', label: 'Niños y niñas han pasado por nuestros campus', icon: Users }, { number: '4', label: 'Sedes diferentes', icon: MapPin }, { number: '3', label: 'Momentos del año', detail: 'Navidad · Semana Santa · Verano', icon: Sun }].map((item) => <article key={item.label} className="group rounded-3xl border border-white/10 bg-navy/60 p-5 text-center shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:border-gold/50 md:p-7"><item.icon className="mx-auto h-7 w-7 text-gold" /><p className="mt-4 font-heading text-5xl font-black leading-none text-gold md:text-6xl">{item.number}</p><h3 className="mt-4 text-xs font-bold uppercase leading-relaxed tracking-wide text-white md:text-sm">{item.label}</h3>{item.detail && <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.detail}</p>}</article>)}</div></div></section>

            <section id="proximo-campus" className="scroll-mt-24 border-t border-white/10 bg-navy-light/40 py-20 md:py-28"><div className="container"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Próximo campus</p><h2 className="mt-3 font-heading text-4xl font-black uppercase text-white md:text-6xl">Tu próxima experiencia<br /><span className="text-gold">empieza aquí.</span></h2></div>{firstCampus ? <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[2rem] border border-gold/30 bg-navy shadow-2xl"><div className="grid lg:grid-cols-[1fr_.9fr]"><div className="p-7 md:p-10"><p className="text-sm font-bold uppercase tracking-[0.16em] text-gold">Edición abierta</p><h3 className="mt-3 font-heading text-4xl font-black uppercase text-white">{firstCampus.name}</h3><div className="mt-7 grid gap-4 text-sm text-slate-200 sm:grid-cols-2"><p className="flex gap-2"><CalendarDays className="h-5 w-5 shrink-0 text-gold" />{new Date(firstCampus.start_date).toLocaleDateString('es-ES')} – {new Date(firstCampus.end_date).toLocaleDateString('es-ES')}</p><p className="flex gap-2"><Users className="h-5 w-5 shrink-0 text-gold" />{firstCampus.capacity} plazas</p>{firstCampus.price !== null && <p className="flex gap-2"><Medal className="h-5 w-5 shrink-0 text-gold" />{Number(firstCampus.price).toFixed(2)} €</p>}<p className="flex gap-2"><MapPin className="h-5 w-5 shrink-0 text-gold" />Sede confirmada por Academy</p></div></div><div className="flex flex-col justify-center gap-3 bg-gold p-7 text-navy md:p-10"><p className="font-heading text-2xl font-black uppercase">Reserva tu plaza</p><p className="text-sm leading-relaxed text-navy/75">La academia confirmará todos los detalles de esta edición.</p><Button asChild className="mt-3 bg-navy font-bold text-white hover:bg-navy/90"><Link href={`/inscripcion?service=campus&activity=${firstCampus.id}`}>Reserva tu plaza</Link></Button><Button asChild variant="outline" className="border-navy/25 bg-white/25 font-bold text-navy hover:bg-white/50"><Link href="/contacto">Más información</Link></Button></div></div></div> : <div className="mx-auto mt-12 max-w-3xl rounded-[2rem] border border-dashed border-gold/40 bg-white/[.045] p-10 text-center"><CalendarDays className="mx-auto h-11 w-11 text-gold" /><h3 className="mt-5 font-heading text-3xl font-black uppercase text-white">La próxima experiencia está en camino.</h3><p className="mx-auto mt-3 max-w-xl text-slate-300">Todavía no hay una edición publicada. Déjanos tus datos y te avisaremos cuando abramos las próximas plazas.</p><Button asChild className="mt-7 bg-gold font-bold text-navy hover:bg-gold-light"><Link href="/contacto">Descubre el próximo campus</Link></Button></div>}</div></section>

            <section className="container py-20 text-center md:py-28"><p className="font-heading text-4xl font-black uppercase text-white md:text-6xl">Jugar. Compartir.<br /><span className="text-gold">Disfrutar.</span></p><p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">Porque durante las vacaciones también se aprende, se hacen amigos y se crean recuerdos.</p><p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-gold">Academy Costa Brava</p></section>
        </div>
    )
}
