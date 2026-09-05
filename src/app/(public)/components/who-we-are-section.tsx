import Link from "next/link"
import { Trophy, UsersRound, Zap } from "lucide-react"

const pillars = [
    { title: 'Academia', description: 'Tecnificación y Metodología 360º adaptada a cada etapa.', icon: Zap },
    { title: 'Campus', description: 'Fútbol, convivencia y aprendizaje durante todo el año.', icon: UsersRound },
    { title: 'Torneos', description: 'Experiencias regionales, nacionales e internacionales.', icon: Trophy },
]

export default function WhoWeAreSection() {
    return (
        <section className="relative overflow-hidden bg-navy py-20 md:py-28">
            <div className="pointer-events-none absolute -left-36 top-24 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
            <div className="pointer-events-none absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-gold/10 blur-[140px]" />
            <div className="container relative z-10">
                <div className="mx-auto max-w-4xl text-center">
                    <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-bold tracking-widest text-gold uppercase">Academy Costa Brava</span>
                    <h2 className="mt-5 font-heading text-5xl font-black uppercase leading-[.9] text-white md:text-7xl">Quiénes <span className="text-gold">somos</span></h2>
                </div>

                <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
                    <div className="contents text-base leading-relaxed text-slate-200 md:text-lg lg:block lg:space-y-5">
                        <p className="order-1"><strong className="text-white">Academy Costa Brava es una academia de fútbol orientada al desarrollo integral del futbolista</strong>, acompañando a cada jugador en su crecimiento deportivo y personal.</p>
                        <div className="order-3 space-y-5">
                        <p>Nuestra base es la <strong className="text-gold">tecnificación y nuestra Metodología 360º</strong>, con la que trabajamos de forma adaptada a la edad, nivel y etapa de desarrollo de cada jugador. Nuestro objetivo va más allá de perfeccionar la técnica: buscamos formar futbolistas capaces de <strong className="text-white">comprender el juego, tomar mejores decisiones y competir con confianza</strong>.</p>
                        <p>Nuestra formación se complementa con <strong className="text-white">campus y actividades durante diferentes periodos del año</strong>, donde combinamos fútbol, aprendizaje, convivencia y experiencias que contribuyen al desarrollo del jugador dentro y fuera del campo.</p>
                        <p>Además, ofrecemos la posibilidad de participar en <strong className="text-white">torneos regionales, nacionales e internacionales</strong>, permitiendo a nuestros jugadores vivir nuevos contextos competitivos y poner en práctica todo lo aprendido durante su proceso de formación.</p>
                        </div>
                    </div>

                    <figure className="relative order-2 mx-auto w-full max-w-[360px] overflow-hidden rounded-[1.75rem] border border-gold/35 bg-navy-light p-2 shadow-2xl shadow-black/40">
                        <video
                            className="aspect-[9/16] w-full rounded-[1.3rem] bg-black object-contain"
                            controls
                            playsInline
                            preload="metadata"
                            poster="/academy-presentacion-poster.jpg"
                            aria-label="Presentación de Academy Costa Brava por Manuel Matías"
                        >
                            <source src="/academy-presentacion.mp4" type="video/mp4" />
                            Tu navegador no permite reproducir este vídeo.
                        </video>
                        <figcaption className="px-3 pb-1 pt-3 text-center text-xs font-medium text-slate-300">Conoce Academy Costa Brava con Manuel Matías.</figcaption>
                    </figure>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {pillars.map((pillar) => <article key={pillar.title} className="rounded-2xl border border-white/10 bg-white/[.045] p-5 text-center transition hover:-translate-y-1 hover:border-gold/45 hover:bg-white/[.08]">
                        <pillar.icon className="mx-auto h-7 w-7 text-gold" />
                        <h3 className="mt-4 font-heading text-2xl font-bold uppercase text-white">{pillar.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{pillar.description}</p>
                    </article>)}
                </div>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link href="/academia" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-6 py-3 text-center font-bold text-navy transition hover:bg-gold-light">Conocer el programa Academy</Link>
                    <Link href="/dossier-tecnificacion-2026-27.pdf" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-6 py-3 text-center font-bold text-white transition hover:border-gold/60 hover:text-gold">Descargar dossier PDF</Link>
                </div>

                <p className="mt-10 text-center font-heading text-xl font-black tracking-[0.12em] text-gold md:text-2xl">ENTRENA · APRENDE · COMPITE · DISFRUTA</p>
                <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-slate-300 md:text-base">No se trata solo de formar mejores futbolistas, sino de acompañar a cada jugador para que llegue tan lejos como su esfuerzo, su ilusión y su talento le permitan.</p>
            </div>
        </section>
    )
}
