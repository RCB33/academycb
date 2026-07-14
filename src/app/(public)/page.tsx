import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowRight, Star, Shield, Zap, TrendingUp, HeartHandshake } from "lucide-react"
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
                            <Link href="#agente">Unirse Ahora <ArrowRight className="ml-2 h-5 w-5" /></Link>
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

            {/* ACADEMY METHODOLOGY */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="container relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-5xl md:text-7xl font-bold text-navy mb-4 uppercase">
                            Nuestra <span className="text-primary">Filosofía</span>
                        </h2>
                        <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="group relative overflow-hidden border-2 border-gray-100 bg-white hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 rounded-2xl">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap className="w-32 h-32 text-primary" />
                            </div>
                            <CardHeader className="relative z-10 pt-10 pb-8 px-8">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <Zap className="h-7 w-7 text-primary group-hover:text-white" />
                                </div>
                                <CardTitle className="font-heading text-3xl font-bold text-navy mb-3 uppercase">Alto Rendimiento</CardTitle>
                                <CardDescription className="text-lg leading-relaxed text-gray-600">
                                    Entrenamientos diseñados bajo metodología profesional para maximizar la técnica, táctica y capacidad física.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="group relative overflow-hidden border-2 border-gray-100 bg-navy text-white hover:border-secondary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 rounded-2xl">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp className="w-32 h-32 text-secondary" />
                            </div>
                            <CardHeader className="relative z-10 pt-10 pb-8 px-8">
                                <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:bg-secondary group-hover:text-navy transition-colors duration-300">
                                    <TrendingUp className="h-7 w-7 text-secondary group-hover:text-navy" />
                                </div>
                                <CardTitle className="font-heading text-3xl font-bold text-white mb-3 uppercase">Data Driven</CardTitle>
                                <CardDescription className="text-lg leading-relaxed text-gray-300">
                                    Seguimiento digital detallado. Métricas FIFA, análisis de rendimiento y tarjetas de jugador personalizadas.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="group relative overflow-hidden border-2 border-gray-100 bg-white hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 rounded-2xl">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Shield className="w-32 h-32 text-primary" />
                            </div>
                            <CardHeader className="relative z-10 pt-10 pb-8 px-8">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <Shield className="h-7 w-7 text-primary group-hover:text-white" />
                                </div>
                                <CardTitle className="font-heading text-3xl font-bold text-navy mb-3 uppercase">Valores Pro</CardTitle>
                                <CardDescription className="text-lg leading-relaxed text-gray-600">
                                    Formamos personas, no solo futbolistas. Disciplina, respeto, trabajo en equipo y mentalidad ganadora.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </section>

            {/* PROGRAMS SPLIT */}
            <section className="grid md:grid-cols-2 min-h-[600px]">
                <div className="relative group overflow-hidden bg-navy flex items-center justify-center p-12">
                    <div className="relative z-10 max-w-md text-center md:text-left">
                        <span className="text-secondary font-bold tracking-widest uppercase text-sm mb-4 block">Formación Continua</span>
                        <h3 className="font-heading text-5xl font-bold text-white mb-6 uppercase">Academia <br /> Anual</h3>
                        <p className="text-gray-300 mb-8 text-lg">
                            Para jugadores que buscan desarrollo a largo plazo. Temporada completa de septiembre a junio.
                        </p>
                        <Button asChild variant="link" className="text-white hover:text-secondary p-0 text-xl font-heading font-bold uppercase decoration-2 underline-offset-8">
                            <Link href="/academia">Ver detalles <ArrowRight className="ml-2" /></Link>
                        </Button>
                    </div>
                </div>
                <div className="relative group overflow-hidden bg-gray-100 flex items-center justify-center p-12">
                    <div className="absolute inset-0 bg-white/50"></div>
                    <div className="relative z-10 max-w-md text-center md:text-left">
                        <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">Experiencias Intensivas</span>
                        <h3 className="font-heading text-5xl font-bold text-navy mb-6 uppercase">Campus <br /> de Verano</h3>
                        <p className="text-gray-600 mb-8 text-lg">
                            Semanas de inmersión total. Fútbol, diversión y convivencia en instalaciones de primer nivel.
                        </p>
                        <Button asChild variant="link" className="text-navy hover:text-primary p-0 text-xl font-heading font-bold uppercase decoration-2 underline-offset-8">
                            <Link href="/campus">Próximas fechas <ArrowRight className="ml-2" /></Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* WHO WE ARE SECTION */}
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
