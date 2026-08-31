import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Brain, Dumbbell, HeartHandshake, Target } from "lucide-react"

export default function WhoWeAreSection() {
    const dimensions = [
        {
            title: "Técnica individual",
            icon: Target,
            description: "Control, pase, conducción, regate y finalización para trasladar cada aprendizaje a situaciones reales de juego.",
        },
        {
            title: "Táctica y cognitiva",
            icon: Brain,
            description: "Lectura del juego, ocupación de espacios, percepción y toma de decisiones.",
        },
        {
            title: "Física y coordinativa",
            icon: Dumbbell,
            description: "Agilidad, velocidad, fuerza, potencia y control corporal adaptados a cada etapa.",
        },
        {
            title: "Socioafectiva",
            icon: HeartHandshake,
            description: "Confianza, autonomía, responsabilidad y gestión del error dentro y fuera del campo.",
        },
    ]

    return (
        <section className="relative overflow-hidden bg-navy py-20 md:py-28">
            <div className="pointer-events-none absolute -left-36 top-24 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
            <div className="pointer-events-none absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-gold/10 blur-[140px]" />
            <div className="container relative z-10">
                <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
                    <div>
                        <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-bold tracking-widest text-gold uppercase">Academy Costa Brava</span>
                        <h2 className="mt-5 font-heading text-5xl font-black uppercase leading-[.9] text-white md:text-7xl">Quiénes <span className="text-gold">somos</span></h2>
                        <div className="mt-7 max-w-2xl space-y-5 text-base leading-relaxed text-slate-200 md:text-lg">
                            <p><strong className="text-white">Academy Costa Brava es una academia de tecnificación orientada al desarrollo integral del futbolista.</strong></p>
                            <p>Nuestro objetivo va más allá de perfeccionar la técnica. Formamos jugadores capaces de comprender el juego, tomar mejores decisiones y competir con confianza, con una metodología adaptada a su edad, nivel y etapa de desarrollo.</p>
                            <p>La formación no termina en el terreno de juego: entendemos el fútbol como <strong className="text-gold">una herramienta de aprendizaje para la vida</strong>, fomentando el esfuerzo, la responsabilidad, la autonomía, el respeto, el compañerismo y la capacidad de gestionar el error.</p>
                        </div>
                        <div className="mt-8 max-w-xl rounded-2xl border border-gold/50 bg-navy-light/80 p-5 shadow-xl shadow-black/20">
                            <p className="font-heading text-xl font-black uppercase leading-tight text-white md:text-2xl">Formamos futbolistas. <span className="text-gold">Acompañamos personas.</span></p>
                            <p className="mt-2 text-sm font-semibold text-gold">El fútbol como herramienta de aprendizaje para la vida.</p>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-[33rem]">
                        <div className="absolute -inset-4 rounded-[2rem] bg-gold/15 blur-2xl" />
                        <div className="relative overflow-hidden rounded-[1.7rem] border border-gold/35 bg-navy-light p-2 shadow-2xl shadow-black/40">
                            <Image src="/academy-dossier-360.jpg" alt="Quiénes somos y metodología 360 de Academy Costa Brava" width={1000} height={1500} className="h-auto w-full rounded-[1.25rem]" />
                        </div>
                        <p className="relative mt-3 text-center text-xs font-medium text-slate-400">Dossier de tecnificación Academy Costa Brava · Temporada 2026/27</p>
                    </div>
                </div>

                <div className="mt-20 border-t border-white/10 pt-16">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-bold tracking-[0.2em] text-gold uppercase">Metodología 360º</p>
                        <h3 className="mt-3 font-heading text-4xl font-black uppercase text-white md:text-6xl">Cuatro dimensiones.<br /><span className="text-gold">Un mismo jugador.</span></h3>
                        <p className="mt-5 text-base leading-relaxed text-slate-300 md:text-lg">No entrenamos únicamente para ejecutar mejor, sino para comprender mejor el juego.</p>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {dimensions.map((dimension) => <article key={dimension.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-gold/50 hover:bg-white/[.08]">
                            <dimension.icon className="h-7 w-7 text-gold" />
                            <h4 className="mt-5 font-heading text-2xl font-bold uppercase text-white">{dimension.title}</h4>
                            <p className="mt-3 text-sm leading-relaxed text-slate-300">{dimension.description}</p>
                        </article>)}
                    </div>

                    <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link href="/academia" className="inline-flex items-center rounded-xl bg-gold px-6 py-3 font-bold text-navy transition hover:bg-gold-light">Conocer el programa Academy <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        <Link href="/dossier-tecnificacion-2026-27.pdf" target="_blank" className="inline-flex items-center rounded-xl border border-white/20 px-6 py-3 font-bold text-white transition hover:border-gold/60 hover:text-gold">Ver dossier completo</Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
