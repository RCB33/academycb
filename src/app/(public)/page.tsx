import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Star, Shield, Zap, TrendingUp, HeartHandshake, Play } from "lucide-react"
import LeadWidget from "./components/lead-widget"
import WhoWeAreSection from "./components/who-we-are-section"
import { getPublicSettings } from "@/lib/public-settings"

export default async function LandingPage() {
    const settings = await getPublicSettings()
    return (
        <div className="flex flex-col min-h-screen font-sans text-foreground">

            {/* HER HERO SECTION */}
            <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/landing-hero-new.png"
                        alt="Academy Costa Brava Training Facility at Dusk"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-navy/60 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
                </div>

                {/* Content */}
                <div className="container relative z-10 flex flex-col items-center text-center px-4">
                    <div className="inline-block animate-fade-in-up">
                        <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-bold text-gold backdrop-blur-md mb-8 tracking-wider">
                            <Star className="mr-2 h-4 w-4 fill-gold" /> {settings.current_season ? `TEMPORADA ${settings.current_season}` : 'INSCRIPCIONES ABIERTAS'}
                        </span>
                    </div>

                    <h1 className="font-heading text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-white mb-6 uppercase leading-[0.9]">
                        Academy <br className="hidden md:block" />
                        <span className="text-gold">Costa Brava</span>
                    </h1>

                    <p className="max-w-2xl text-lg md:text-xl text-gray-200 mb-10 font-light leading-relaxed">
                        Formación futbolística en la Costa Brava.
                        Entrenamiento, seguimiento y valores dentro y fuera del campo.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
                        <Button size="lg" className="h-14 px-10 text-lg font-heading font-bold tracking-wide uppercase rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all bg-gold hover:bg-gold/90 text-navy border-none" asChild>
                            <Link href="/inscripcion">Inscribirse <ArrowRight className="ml-2 h-5 w-5" /></Link>
                        </Button>
                        <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-heading font-bold tracking-wide uppercase rounded-xl border-2 border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/40 shadow-lg" asChild>
                            <Link href="/academia">Ver metodología</Link>
                        </Button>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-gold to-transparent"></div>
                </div>
            </section>

            {/* ACADEMY PRESENTATION VIDEO */}
            <section className="relative overflow-hidden bg-navy py-16 md:py-24">
                <div className="absolute -left-32 top-1/3 h-72 w-72 rounded-full border border-gold/15" />
                <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-gold/5 blur-3xl" />

                <div className="container relative z-10 px-4">
                    <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1fr_380px] lg:gap-20">
                        <div className="text-center lg:text-left">
                            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">
                                <Play className="h-4 w-4 fill-gold" /> Academy en 90 segundos
                            </span>
                            <h2 className="font-heading text-4xl font-bold uppercase leading-tight text-white sm:text-5xl md:text-6xl">
                                Mucho más que <span className="text-gold">fútbol</span>
                            </h2>
                            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/75 lg:mx-0">
                                Manuel Matías te cuenta quiénes somos, cómo entrenamos y por qué acompañamos a cada jugador dentro y fuera del campo.
                            </p>
                            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-gold/90">
                                Entrena · Aprende · Compite · Disfruta
                            </p>
                        </div>

                        <div className="mx-auto w-full max-w-[360px]">
                            <div className="relative overflow-hidden rounded-[2rem] border border-gold/50 bg-black p-1.5 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
                                <video
                                    className="aspect-[9/16] w-full rounded-[1.65rem] bg-black object-cover"
                                    controls
                                    playsInline
                                    preload="metadata"
                                    poster="/academy-presentacion-poster.jpg"
                                    aria-label="Presentación de Academy Costa Brava por Manuel Matías"
                                >
                                    <source src="/academy-presentacion.mp4" type="video/mp4" />
                                    Tu navegador no permite reproducir este vídeo.
                                </video>
                            </div>
                            <p className="mt-4 text-center text-sm text-white/55">
                                Pulsa para conocer nuestra forma de trabajar.
                            </p>
                        </div>
                    </div>
                </div>
            </section>


            {/* PRINCIPLES STRIP */}
            <section className="py-12 bg-navy border-b border-white/5">
                <div className="container">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: "TÉCNICA", icon: Zap },
                            { label: "TÁCTICA", icon: TrendingUp },
                            { label: "EQUIPO", icon: Shield },
                            { label: "VALORES", icon: HeartHandshake },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center justify-center p-4">
                                <stat.icon className="h-8 w-8 text-secondary mb-3 opacity-80" />
                                <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <WhoWeAreSection />

            {/* AGENT WIDGET SECTION */}
            <section id="agente" className="py-24 bg-navy relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-primary/20" />

                <div className="container relative z-10">
                    <div className="flex flex-col md:flex-row gap-16 items-center">
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="font-heading text-5xl md:text-7xl font-bold text-white mb-6 uppercase leading-tight">
                                Tu camino <br />
                                <span className="text-gold">Empieza Aquí</span>
                            </h2>
                            <p className="text-xl text-gray-300 mb-8 max-w-lg">
                                Cuéntanos qué estás buscando y el equipo de la academia te orientará sobre las opciones disponibles.
                            </p>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4 text-white/80">
                                    <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                                        <div className="h-3 w-3 rounded-full bg-secondary animate-pulse" />
                                    </div>
                                    <span className="font-medium">Respuesta personalizada</span>
                                </div>
                                <div className="flex items-center gap-4 text-white/80">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Star className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-medium">Plan personalizado</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-[500px]">
                            <div className="bg-white rounded-3xl p-2 shadow-2xl shadow-navy-light/50">
                                <LeadWidget whatsappNumber={settings.academy_whatsapp || settings.academy_phone} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    )
}
