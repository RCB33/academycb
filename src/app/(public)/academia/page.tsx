import { Badge, Brain, CalendarDays, Clock3, Dumbbell, ExternalLink, FileText, HeartHandshake, MapPin, ShieldCheck, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { CarouselCustom } from "@/components/ui/carousel-custom"
import { Button } from "@/components/ui/button"

export const metadata = {
    title: 'Academia de fútbol',
    description: 'Conoce la metodología y el programa formativo de Academy Costa Brava.'
}

export default function AcademyPage() {
    const galleryImages = [
        "/academy-gallery-1.jpg",
        "/academy-gallery-2.jpg",
        "/academy-gallery-3.jpg",
        "/academy-gallery-4.jpg",
        "/academy-gallery-5.jpg",
        "/academy-gallery-6.jpg",
        "/academy-gallery-7.jpg",
        "/academy-gallery-8.jpg",
        "/academy-gallery-9.jpg",
    ]

    const plans = [
        {
            title: 'Una sesión semanal',
            price: '75 €',
            suffix: '/ mes',
            detail: 'Una sesión de entrenamiento por semana.',
        },
        {
            title: 'Dos sesiones semanales',
            price: '140 €',
            suffix: '/ mes',
            detail: 'Una sesión de lunes a viernes y otra el domingo.',
            featured: true,
        },
        {
            title: 'Matrícula de inscripción',
            price: '30 €',
            suffix: ' pago único',
            detail: 'Matrícula única al formalizar la inscripción para nuevos jugadores.',
        },
    ]

    const weeklySchedule = [
        { day: 'Martes', slots: ['17:30 - 19:00 · Benjamines', '19:00 - 20:30 · Infantiles'] },
        { day: 'Miércoles', slots: ['17:30 - 19:00 · Benjamines', '19:00 - 20:30 · Infantiles / Cadetes'] },
        { day: 'Jueves', slots: ['17:30 - 19:00 · Alevines'] },
        { day: 'Viernes', slots: ['17:00 - 18:30 · Escoleta / Prebenjamines'] },
    ]

    const methodologyDimensions = [
        { title: 'Técnica individual', icon: Badge, text: 'Control, pase, conducción, regate y finalización. Un objetivo técnico cada mes, adaptado a la edad y al nivel.' },
        { title: 'Táctica y cognitiva', icon: Brain, text: 'Lectura del juego, ocupación de espacios, percepción y toma de decisiones para comprender mejor el juego.' },
        { title: 'Física y coordinativa', icon: Dumbbell, text: 'Agilidad, velocidad, fuerza, potencia y control corporal para crecer con seguridad y confianza.' },
        { title: 'Socioafectiva', icon: HeartHandshake, text: 'Confianza, autonomía, responsabilidad y gestión del error dentro y fuera del campo.' },
    ]

    return (
        <div className="min-h-screen bg-navy text-white">
            {/* Hero Section */}
            <div className="relative py-20 md:py-32 overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

                <div className="container relative z-10">
                    <div className="text-center mb-16">
                        <h1 className="font-heading text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white uppercase drop-shadow-lg">
                            Nuestra <span className="text-gold">Academia</span>
                        </h1>
                        <div className="w-32 h-2 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto rounded-full mb-8"></div>
                        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                            Un programa de formación integral diseñado para desarrollar futbolistas completos,
                            <span className="text-gold font-semibold"> dentro y fuera del campo</span>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container pb-24">
                <section className="-mt-6 mb-24 rounded-3xl border border-gold/25 bg-gradient-to-br from-navy-light to-navy p-6 shadow-2xl shadow-black/20 md:-mt-12 md:p-10">
                    <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-bold tracking-[0.16em] text-gold uppercase"><Sparkles className="h-4 w-4" /> Temporada 2026/27</div>
                            <h2 className="mt-3 font-heading text-4xl font-bold uppercase text-white md:text-5xl">Tecnificación para crecer <span className="text-gold">jugando</span></h2>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">Entrenamientos adaptados a edad y nivel, seguimiento individual y grupos reducidos para jugadores y porteros.</p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                            <Button asChild size="lg" className="bg-gold font-bold text-navy hover:bg-gold-light">
                                <Link href="/inscripcion?service=academy">Reserva tu plaza</Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-white/25 bg-white/5 font-bold text-white hover:bg-white/10 hover:text-white">
                                <a href="/dossier-tecnificacion-2026-27.pdf" target="_blank" rel="noreferrer"><FileText className="mr-2 h-4 w-4" /> Ver dossier PDF <ExternalLink className="ml-2 h-4 w-4" /></a>
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="mb-24 scroll-mt-24" aria-labelledby="tarifas-title">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-bold tracking-[0.18em] text-gold uppercase">Planes y cuotas</p>
                        <h2 id="tarifas-title" className="mt-2 font-heading text-4xl font-bold uppercase text-white md:text-5xl">Elige tu ritmo de <span className="text-gold">entrenamiento</span></h2>
                        <p className="mt-4 text-gray-300">Elige la opción que mejor encaje con el desarrollo y disponibilidad del jugador.</p>
                    </div>

                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        {plans.map((plan) => (
                            <article key={plan.title} className={`relative flex flex-col rounded-3xl border p-7 ${plan.featured ? 'border-gold bg-gold text-navy shadow-xl shadow-gold/15' : 'border-white/15 bg-white/5 text-white'}`}>
                                {plan.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-navy px-4 py-1 text-xs font-bold tracking-wide text-gold uppercase">Opción completa</span>}
                                <CalendarDays className={`h-7 w-7 ${plan.featured ? 'text-navy' : 'text-gold'}`} />
                                <h3 className="mt-5 font-heading text-3xl font-bold uppercase">{plan.title}</h3>
                                <p className={`mt-3 min-h-12 text-sm leading-relaxed ${plan.featured ? 'text-navy/80' : 'text-gray-300'}`}>{plan.detail}</p>
                                <div className="mt-7 border-t border-current/20 pt-5"><span className="font-heading text-5xl font-black">{plan.price}</span><span className="ml-1 font-bold">{plan.suffix}</span></div>
                            </article>
                        ))}
                    </div>

                    <div className="mt-5 grid gap-4 rounded-2xl border border-gold/30 bg-navy-light/80 p-5 text-sm md:grid-cols-[auto_1fr_auto] md:items-center md:px-7">
                        <ShieldCheck className="h-7 w-7 text-gold" />
                        <p className="text-gray-200"><strong className="text-white">Plan Plus: +50 €.</strong> Incluye posibilidad de recuperar sesiones, condiciones especiales en campus y torneos y beneficios en actividades Academy.</p>
                        <a className="inline-flex items-center font-bold text-gold hover:text-gold-light" href="/dossier-tecnificacion-2026-27.pdf" target="_blank" rel="noreferrer">Ver condiciones <ExternalLink className="ml-1 h-4 w-4" /></a>
                    </div>
                </section>

                <section className="mb-24 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10" aria-labelledby="horarios-title">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-sm font-bold tracking-[0.18em] text-gold uppercase">Días, sedes y horarios</p>
                            <h2 id="horarios-title" className="mt-2 font-heading text-4xl font-bold uppercase text-white">Entrena durante la <span className="text-gold">semana</span></h2>
                        </div>
                        <p className="max-w-md text-sm leading-relaxed text-gray-300">Grupos organizados por edad y nivel. La secretaría confirma el grupo y horario definitivo al reservar plaza.</p>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {weeklySchedule.map((schedule) => (
                            <article key={schedule.day} className="rounded-2xl border border-gold/25 bg-navy p-5">
                                <div className="flex items-center gap-2 text-gold"><Clock3 className="h-4 w-4" /><h3 className="font-heading text-2xl font-bold uppercase">{schedule.day}</h3></div>
                                <ul className="mt-4 space-y-3 text-sm text-gray-200">{schedule.slots.map((slot) => <li key={slot} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">{slot}</li>)}</ul>
                            </article>
                        ))}
                    </div>

                    <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
                        <div className="flex gap-3 rounded-2xl bg-navy p-5"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p className="text-sm leading-relaxed text-gray-300"><strong className="block text-white">Tecnificación de porteros</strong>Martes y miércoles · Camp Municipal de Santa Cristina d&apos;Aro. Fútbol 7: 17:15 - 18:30 · Fútbol 11: 18:30 - 19:45.</p></div>
                        <div className="flex gap-3 rounded-2xl bg-navy p-5"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><p className="text-sm leading-relaxed text-gray-300"><strong className="block text-white">Sesiones de domingo</strong>Camp Municipal de Sant Feliu de Guíxols. Horarios de verano e invierno disponibles en el dossier.</p></div>
                    </div>
                </section>

                <section className="mb-32" aria-labelledby="metodologia-title">
                    <div className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
                        <div className="relative mx-auto w-full max-w-[30rem]">
                            <div className="absolute -inset-4 rounded-[2rem] bg-gold/15 blur-2xl" />
                            <div className="relative overflow-hidden rounded-[1.7rem] border-2 border-gold/30 bg-navy-light p-2 shadow-2xl shadow-black/40">
                                <Image src="/academy-dossier-360.jpg" alt="Metodología 360 grados Academy Costa Brava" width={1000} height={1500} className="h-auto w-full rounded-[1.2rem]" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold tracking-[0.2em] text-gold uppercase">Metodología 360º</p>
                            <h2 id="metodologia-title" className="mt-3 font-heading text-4xl font-black uppercase leading-tight text-white md:text-5xl">Cuatro dimensiones.<br /><span className="text-gold">Un mismo jugador.</span></h2>
                            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-300">No entrenamos únicamente para ejecutar mejor, sino para comprender mejor el juego. Cada contenido se adapta a la edad y nivel del jugador y progresa hacia situaciones reales de juego y competición.</p>
                            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                {methodologyDimensions.map((dimension) => <article key={dimension.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-gold/40 hover:bg-white/[.08]">
                                    <dimension.icon className="h-6 w-6 text-gold" />
                                    <h3 className="mt-4 font-heading text-xl font-bold uppercase text-white">{dimension.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-300">{dimension.text}</p>
                                </article>)}
                            </div>
                            <div className="mt-7 rounded-2xl border border-gold/30 bg-gold/10 p-5"><p className="font-heading text-xl font-black uppercase text-white">Evaluación y <span className="text-gold">seguimiento individual</span></p><p className="mt-2 text-sm leading-relaxed text-gray-300">Dos ciclos de evaluación nos permiten comparar el punto de partida con el nivel alcanzado, identificar áreas de mejora y adaptar el trabajo a cada futbolista.</p></div>
                        </div>
                    </div>
                </section>

                {/* Photo Gallery Section */}
                <div className="mb-32">
                    <div className="flex flex-col items-center mb-12 text-center">
                        <Badge className="w-12 h-12 text-gold mb-4" />
                        <h3 className="font-heading text-4xl font-bold text-white mb-4">Galería de <span className="text-gold">Momentos</span></h3>
                        <p className="text-gray-400 max-w-2xl">Capturas de nuestros entrenamientos, partidos y momentos inolvidables en la academia.</p>
                    </div>

                    <div className="w-full max-w-5xl mx-auto p-2 md:p-4 rounded-3xl bg-gradient-to-br from-navy-light to-navy border border-white/10 shadow-2xl">
                        <CarouselCustom images={galleryImages} className="aspect-video md:aspect-[16/9] w-full rounded-2xl" />
                    </div>
                </div>

                <div className="max-w-3xl mx-auto rounded-3xl border border-gold/20 bg-navy-light p-8 text-center md:p-10">
                    <h2 className="font-heading text-4xl font-bold mb-5 text-white">¿Listo para empezar?</h2>
                    <p className="text-lg text-gray-300 mb-8">Reserva la plaza sin compromiso de pago. Te confirmaremos grupo, horario y los siguientes pasos de forma personalizada.</p>
                    <div className="flex flex-col justify-center gap-3 sm:flex-row">
                        <Button asChild size="lg" className="bg-gold text-navy font-bold hover:bg-gold-light"><Link href="/inscripcion?service=academy">Solicitar plaza</Link></Button>
                        <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"><a href="/dossier-tecnificacion-2026-27.pdf" target="_blank" rel="noreferrer">Ver dossier PDF</a></Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
