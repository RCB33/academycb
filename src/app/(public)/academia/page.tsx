import { Badge, Brain, CalendarDays, CheckCircle2, CircleDot, Clock3, Dumbbell, ExternalLink, FileText, HeartHandshake, MapPin, ShieldCheck, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { CarouselCustom } from "@/components/ui/carousel-custom"
import { Button } from "@/components/ui/button"

export const metadata = {
    title: 'Academia de fútbol',
    description: 'Tecnificación y Metodología 360º para el desarrollo integral del futbolista.'
}

const plans = [
    { title: 'Una sesión semanal', price: '75 €', suffix: '/ mes', detail: 'Una sesión de entrenamiento por semana.' },
    { title: 'Dos sesiones semanales', price: '140 €', suffix: '/ mes', detail: 'Una sesión de lunes a viernes y otra el domingo.', featured: true },
    { title: 'Matrícula de inscripción', price: '30 €', suffix: ' pago único', detail: 'Matrícula única al formalizar la inscripción para nuevos jugadores.' },
]

const weeklySchedule = [
    { day: 'Martes', slots: ['17:30 - 19:00 · Benjamines', '19:00 - 20:30 · Infantiles'] },
    { day: 'Miércoles', slots: ['17:30 - 19:00 · Benjamines', '19:00 - 20:30 · Infantiles / Cadetes'] },
    { day: 'Jueves', slots: ['17:30 - 19:00 · Alevines'] },
    { day: 'Viernes', slots: ['17:00 - 18:30 · Escoleta / Prebenjamines'] },
]

const methodologyDimensions = [
    { title: 'Técnica individual', short: 'Control, pase, conducción y finalización.', icon: Badge, text: 'Control, pase, conducción, regate y finalización. Un objetivo técnico cada mes, adaptado a la edad y al nivel.' },
    { title: 'Táctica y cognitiva', short: 'Lectura, percepción y toma de decisiones.', icon: Brain, text: 'Lectura del juego, ocupación de espacios, percepción y toma de decisiones para comprender mejor el juego.' },
    { title: 'Física y coordinativa', short: 'Agilidad, velocidad y control corporal.', icon: Dumbbell, text: 'Agilidad, velocidad, fuerza, potencia y control corporal para crecer con confianza.' },
    { title: 'Socioafectiva', short: 'Confianza, autonomía y responsabilidad.', icon: HeartHandshake, text: 'Confianza, autonomía, responsabilidad y gestión del error dentro y fuera del campo.' },
]

function DimensionCard({ dimension, compact = false }: { dimension: typeof methodologyDimensions[number], compact?: boolean }) {
    return <article className={`rounded-2xl border border-white/10 bg-navy-light/90 ${compact ? 'p-4' : 'p-5'} shadow-xl shadow-black/15 transition hover:-translate-y-1 hover:border-gold/55`}>
        <dimension.icon className="h-6 w-6 text-gold" />
        <h3 className={`mt-3 font-heading font-bold uppercase text-white ${compact ? 'text-lg leading-tight' : 'text-xl'}`}>{dimension.title}</h3>
        {compact ? <p className="mt-2 text-xs font-medium text-slate-300">{dimension.short}</p> : <p className="mt-2 text-sm leading-relaxed text-slate-300">{dimension.text}</p>}
    </article>
}

export default function AcademyPage() {
    const galleryImages = [
        "/academy-gallery-1.jpg", "/academy-gallery-2.jpg", "/academy-gallery-3.jpg", "/academy-gallery-4.jpg", "/academy-gallery-5.jpg", "/academy-gallery-6.jpg", "/academy-gallery-7.jpg", "/academy-gallery-8.jpg", "/academy-gallery-9.jpg",
    ]

    return (
        <div className="min-h-screen bg-navy text-white">
            <section className="relative flex min-h-[72svh] items-end overflow-hidden">
                <Image src="/academy-session.jpg" alt="Entrenamiento de Academy Costa Brava" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/25" />
                <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-navy to-transparent" />
                <div className="container relative z-10 py-20 md:py-28"><div className="max-w-3xl">
                    <p className="inline-flex items-center rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gold backdrop-blur"><Sparkles className="mr-2 h-4 w-4" /> Temporada 2026/27</p>
                    <h1 className="mt-6 font-heading text-5xl font-black uppercase leading-[.88] text-white md:text-8xl">Nuestra<br /><span className="text-gold">Academia.</span></h1>
                    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-200 md:text-2xl">Tecnificación y formación integral para que cada jugador crezca, compita y disfrute del fútbol.</p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="min-h-14 bg-gold px-7 font-bold uppercase text-navy hover:bg-gold-light"><Link href="/inscripcion?service=academy">Reserva tu plaza</Link></Button><Button asChild variant="outline" size="lg" className="min-h-14 border-white/30 bg-white/5 px-7 font-bold text-white hover:bg-white/10 hover:text-white"><a href="/dossier-tecnificacion-2026-27.pdf" target="_blank" rel="noreferrer"><FileText className="mr-2 h-4 w-4" /> Ver dossier PDF</a></Button></div>
                </div></div>
            </section>

            <div className="container py-20 md:py-28">
                <section className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16" aria-labelledby="nuestra-academia-title">
                    <div className="relative min-h-[23rem] overflow-hidden rounded-[2rem] border border-gold/30 shadow-2xl shadow-black/30 md:min-h-[31rem]"><Image src="/academy-group.jpg" alt="Grupo de jugadores de Academy Costa Brava" fill className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent" /><p className="absolute bottom-6 left-6 right-6 font-heading text-3xl font-black uppercase leading-tight text-white">Formamos futbolistas.<br /><span className="text-gold">Acompañamos personas.</span></p></div>
                    <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Academy Costa Brava</p><h2 id="nuestra-academia-title" className="mt-3 font-heading text-4xl font-black uppercase leading-tight text-white md:text-6xl">Más que<br /><span className="text-gold">entrenar.</span></h2><div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-slate-300 md:text-lg"><p>Somos una academia de fútbol orientada al desarrollo integral del futbolista. Acompañamos a cada jugador en su crecimiento deportivo y personal, adaptándonos a su edad, nivel y etapa.</p><p>Buscamos que comprendan mejor el juego, tomen mejores decisiones y compitan con confianza. Porque el fútbol también enseña esfuerzo, responsabilidad, autonomía, respeto y compañerismo.</p></div><div className="mt-7 grid gap-3 sm:grid-cols-3">{['Grupos por edad y nivel', 'Seguimiento individual', 'Fútbol y valores'].map((item) => <div key={item} className="rounded-2xl border border-gold/25 bg-gold/10 p-4 text-sm font-bold text-white"><CheckCircle2 className="mb-2 h-5 w-5 text-gold" />{item}</div>)}</div></div>
                </section>

                <section className="mt-24 rounded-[2rem] border border-white/10 bg-white/[.045] p-6 md:mt-32 md:p-10" aria-labelledby="horarios-title">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Días, sedes y horarios</p><h2 id="horarios-title" className="mt-2 font-heading text-4xl font-black uppercase text-white md:text-5xl">Entrena durante la <span className="text-gold">semana</span></h2></div><p className="max-w-md text-sm leading-relaxed text-slate-300">Grupos organizados por edad y nivel. Secretaría confirma el grupo y horario definitivo al reservar plaza.</p></div>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{weeklySchedule.map((schedule) => <article key={schedule.day} className="rounded-2xl border border-gold/25 bg-navy p-5"><div className="flex items-center gap-2 text-gold"><Clock3 className="h-4 w-4" /><h3 className="font-heading text-2xl font-bold uppercase">{schedule.day}</h3></div><ul className="mt-4 space-y-3 text-sm text-slate-200">{schedule.slots.map((slot) => <li key={slot} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">{slot}</li>)}</ul></article>)}</div>
                    <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2"><div className="flex gap-3 rounded-2xl bg-navy p-5"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p className="text-sm leading-relaxed text-slate-300"><strong className="block text-white">Tecnificación de porteros</strong>Martes y miércoles · Camp Municipal de Santa Cristina d&apos;Aro. Fútbol 7: 17:15 - 18:30 · Fútbol 11: 18:30 - 19:45.</p></div><div className="flex gap-3 rounded-2xl bg-navy p-5"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p className="text-sm leading-relaxed text-slate-300"><strong className="block text-white">Sesiones de domingo</strong>Camp Municipal de Sant Feliu de Guíxols. Horarios de verano e invierno disponibles en el dossier.</p></div></div>
                </section>

                <section className="mt-24 md:mt-32" aria-labelledby="metodologia-title">
                    <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Metodología 360º</p><h2 id="metodologia-title" className="mt-3 font-heading text-4xl font-black uppercase leading-tight text-white md:text-6xl">Cuatro dimensiones.<br /><span className="text-gold">Un mismo jugador.</span></h2><p className="mt-5 text-base leading-relaxed text-slate-300 md:text-lg">No entrenamos únicamente para ejecutar mejor. Trabajamos las cuatro dimensiones que un jugador necesita para disfrutar, comprender y competir.</p></div>
                    <div className="mt-12 md:hidden"><div className="grid gap-4 sm:grid-cols-2">{methodologyDimensions.map((dimension) => <DimensionCard key={dimension.title} dimension={dimension} />)}</div><div className="mx-auto mt-5 flex max-w-xs flex-col items-center rounded-full border border-gold/45 bg-gold/10 px-6 py-8 text-center"><CircleDot className="h-9 w-9 text-gold" /><p className="mt-3 font-heading text-2xl font-black uppercase text-white">Jugador<br /><span className="text-gold">360º</span></p></div></div>
                    <div className="relative mx-auto mt-12 hidden min-h-[35rem] max-w-6xl overflow-hidden rounded-[2.5rem] border border-gold/25 bg-[radial-gradient(circle_at_center,_rgba(216,177,49,.18),transparent_27%),linear-gradient(135deg,_rgba(31,59,96,.8),rgba(7,25,51,.9))] p-8 md:block"><div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/30" /><div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/20" /><div className="absolute left-1/2 top-1/2 z-10 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-gold bg-navy text-center shadow-[0_0_50px_rgba(216,177,49,.25)]"><CircleDot className="h-10 w-10 text-gold" /><p className="mt-3 font-heading text-3xl font-black uppercase leading-none text-white">Jugador<br /><span className="text-gold">360º</span></p></div><div className="absolute left-1/2 top-1/2 h-px w-[62%] -translate-x-1/2 -translate-y-1/2 rotate-[28deg] bg-gold/25" /><div className="absolute left-1/2 top-1/2 h-px w-[62%] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] bg-gold/25" /><div className="relative z-20 grid min-h-[29rem] grid-cols-2 gap-x-[24rem] gap-y-16">{methodologyDimensions.map((dimension) => <DimensionCard key={dimension.title} dimension={dimension} compact />)}</div></div>
                    <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-gold/30 bg-gold/10 p-5 text-center"><p className="font-heading text-xl font-black uppercase text-white">Evaluación y <span className="text-gold">seguimiento individual</span></p><p className="mt-2 text-sm leading-relaxed text-slate-300">Dos ciclos de evaluación permiten comparar el punto de partida, detectar áreas de mejora y adaptar el trabajo a cada futbolista.</p></div>
                </section>

                <section className="mt-24 scroll-mt-24 md:mt-32" aria-labelledby="tarifas-title">
                    <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Planes y cuotas</p><h2 id="tarifas-title" className="mt-2 font-heading text-4xl font-black uppercase text-white md:text-5xl">Elige tu ritmo de <span className="text-gold">entrenamiento</span></h2><p className="mt-4 text-slate-300">Ahora que conoces el programa, elige la opción que mejor encaje con el jugador y vuestra disponibilidad.</p></div>
                    <div className="mt-10 grid gap-5 md:grid-cols-3">{plans.map((plan) => <article key={plan.title} className={`relative flex flex-col rounded-3xl border p-7 ${plan.featured ? 'border-gold bg-gold text-navy shadow-xl shadow-gold/15' : 'border-white/15 bg-white/5 text-white'}`}>{plan.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-navy px-4 py-1 text-xs font-bold uppercase tracking-wide text-gold">Opción completa</span>}<CalendarDays className={`h-7 w-7 ${plan.featured ? 'text-navy' : 'text-gold'}`} /><h3 className="mt-5 font-heading text-3xl font-bold uppercase">{plan.title}</h3><p className={`mt-3 min-h-12 text-sm leading-relaxed ${plan.featured ? 'text-navy/80' : 'text-slate-300'}`}>{plan.detail}</p><div className="mt-7 border-t border-current/20 pt-5"><span className="font-heading text-5xl font-black">{plan.price}</span><span className="ml-1 font-bold">{plan.suffix}</span></div></article>)}</div>
                    <div className="mt-5 grid gap-4 rounded-2xl border border-gold/30 bg-navy-light/80 p-5 text-sm md:grid-cols-[auto_1fr_auto] md:items-center md:px-7"><ShieldCheck className="h-7 w-7 text-gold" /><p className="text-slate-200"><strong className="text-white">Plan Plus: +50 €.</strong> Incluye posibilidad de recuperar sesiones, condiciones especiales en campus y torneos y beneficios en actividades Academy.</p><a className="inline-flex items-center font-bold text-gold hover:text-gold-light" href="/dossier-tecnificacion-2026-27.pdf" target="_blank" rel="noreferrer">Ver condiciones <ExternalLink className="ml-1 h-4 w-4" /></a></div>
                    <div className="mt-8 text-center"><Button asChild size="lg" className="min-h-14 bg-gold px-8 font-bold uppercase text-navy hover:bg-gold-light"><Link href="/inscripcion?service=academy">Reserva tu plaza</Link></Button><p className="mt-3 text-sm text-slate-400">Sin pago en este paso. Secretaría confirma grupo, horario y siguientes pasos.</p></div>
                </section>

                <section className="mt-24 md:mt-32"><div className="mb-12 flex flex-col items-center text-center"><Badge className="mb-4 h-12 w-12 text-gold" /><h2 className="font-heading text-4xl font-black uppercase text-white md:text-5xl">Galería de <span className="text-gold">momentos</span></h2><p className="mt-4 max-w-2xl text-slate-400">Entrenamientos, partidos y aprendizajes que forman parte del camino Academy.</p></div><div className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-gradient-to-br from-navy-light to-navy p-2 shadow-2xl md:p-4"><CarouselCustom images={galleryImages} className="aspect-video w-full rounded-2xl md:aspect-[16/9]" /></div></section>

                <section className="mx-auto mt-24 max-w-3xl rounded-3xl border border-gold/25 bg-navy-light p-8 text-center md:mt-32 md:p-10"><h2 className="font-heading text-4xl font-black uppercase text-white">¿Listo para <span className="text-gold">empezar?</span></h2><p className="mt-5 text-lg text-slate-300">Reserva la plaza sin compromiso de pago. Confirmaremos grupo, horario y los siguientes pasos de forma personalizada.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg" className="bg-gold font-bold text-navy hover:bg-gold-light"><Link href="/inscripcion?service=academy">Solicitar plaza</Link></Button><Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"><a href="/dossier-tecnificacion-2026-27.pdf" target="_blank" rel="noreferrer">Ver dossier PDF</a></Button></div></section>
            </div>
        </div>
    )
}
