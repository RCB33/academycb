import { Badge, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileText, MapPin, ShieldCheck, Sparkles } from "lucide-react"
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

                {/* Methodology Section */}
                <div className="grid md:grid-cols-2 gap-12 mb-32 items-center">
                    <div className="order-2 md:order-1">
                        <h2 className="font-heading text-4xl font-bold mb-8 text-white">Metodología <span className="text-gold">Pro</span></h2>
                        <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                            Nos basamos en el aprendizaje cognitivo y la toma de decisiones. No solo entrenamos el cuerpo, sino también la mente del jugador.
                        </p>
                        <ul className="space-y-8">
                            <li className="flex items-start group">
                                <div className="mr-4 mt-1 p-2 rounded-lg bg-navy-light border border-gold/20 group-hover:border-gold/50 transition-colors">
                                    <Badge className="h-6 w-6 text-gold" />
                                </div>
                                <div>
                                    <h4 className="font-heading font-bold text-2xl text-white mb-2 group-hover:text-gold transition-colors">Técnica Individual</h4>
                                    <p className="text-gray-400">Dominio del balón en todas las situaciones de juego de alta presión.</p>
                                </div>
                            </li>
                            <li className="flex items-start group">
                                <div className="mr-4 mt-1 p-2 rounded-lg bg-navy-light border border-gold/20 group-hover:border-gold/50 transition-colors">
                                    <Badge className="h-6 w-6 text-gold" />
                                </div>
                                <div>
                                    <h4 className="font-heading font-bold text-2xl text-white mb-2 group-hover:text-gold transition-colors">Inteligencia Táctica</h4>
                                    <p className="text-gray-400">Comprensión profunda del juego, espacios y movimientos sin balón.</p>
                                </div>
                            </li>
                            <li className="flex items-start group">
                                <div className="mr-4 mt-1 p-2 rounded-lg bg-navy-light border border-gold/20 group-hover:border-gold/50 transition-colors">
                                    <Badge className="h-6 w-6 text-gold" />
                                </div>
                                <div>
                                    <h4 className="font-heading font-bold text-2xl text-white mb-2 group-hover:text-gold transition-colors">Desarrollo Físico</h4>
                                    <p className="text-gray-400">Trabajo de coordinación, velocidad, movilidad y hábitos para una práctica deportiva segura.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="order-1 md:order-2 relative group">
                        <div className="absolute inset-0 bg-gold/20 rounded-2xl blur-xl transform group-hover:scale-105 transition-transform duration-700"></div>
                        <div className="relative rounded-2xl overflow-hidden border-2 border-gold/30 shadow-2xl">
                            <Image
                                src="/academy-session.jpg"
                                alt="Entrenamiento en Grupo Academy Costa Brava"
                                width={800}
                                height={600}
                                className="object-cover w-full h-full transform hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy to-transparent p-8">
                                <p className="text-white font-heading font-bold text-xl border-l-4 border-gold pl-4">Sesiones Grupales de Alto Rendimiento</p>
                            </div>
                        </div>
                    </div>
                </div>

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
