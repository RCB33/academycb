import { Button } from "@/components/ui/button"
import { Trophy, ExternalLink, Calendar, MapPin, Snowflake, Sun } from "lucide-react"
import Image from "next/image"

export default function TorneosPage() {
    return (
        <div className="min-h-screen bg-navy text-white">
            {/* Hero Section */}
            <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
                <Image
                    src="/tournament-hero-v2.png"
                    alt="Torneos Costa Brava"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-navy/70 mix-blend-multiply" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent" />

                <div className="relative z-10 container flex flex-col items-center text-center">
                    <div className="bg-gold/10 p-6 rounded-full mb-6 ring-1 ring-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                        <Trophy className="h-16 w-16 text-gold drop-shadow-lg" />
                    </div>
                    <h1 className="font-heading text-5xl md:text-8xl font-extrabold tracking-tight mb-8 text-white uppercase drop-shadow-2xl">
                        Torneos <span className="text-gold">&</span> Competiciones
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-16 leading-relaxed">
                        Organizamos las mejores experiencias competitivas. Diversión, competición y valores en un entorno único.
                    </p>
                    <Button size="lg" className="h-16 px-12 text-xl bg-gold hover:bg-white text-navy font-heading font-bold uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] transition-all hover:scale-105" asChild>
                        <a href="https://torneos-demo.com" target="_blank" rel="noopener noreferrer">
                            Portal de Resultados <ExternalLink className="ml-3 h-6 w-6" />
                        </a>
                    </Button>
                </div>
            </div>

            <div className="container py-24 space-y-32">
                {/* WINTER CUP */}
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="order-2 md:order-1">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-full">
                                <Snowflake className="h-8 w-8 text-blue-400" />
                            </div>
                            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white">Winter <span className="text-blue-400">Costa Brava Cup</span></h2>
                        </div>
                        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                            Cierra el año compitiendo al máximo nivel. Un torneo diseñado para equipos que buscan mantener el ritmo durante el parón invernal.
                        </p>
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-4 text-gray-300">
                                <Calendar className="h-6 w-6 text-blue-400" />
                                <span className="text-lg">6 - 9 de Diciembre</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-300">
                                <MapPin className="h-6 w-6 text-blue-400" />
                                <span className="text-lg">Instalaciones Top Costa Brava</span>
                            </div>
                        </div>
                        <Button variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-navy uppercase font-bold tracking-widest">Ver Información</Button>
                    </div>
                    <div className="order-1 md:order-2 relative h-[500px] rounded-3xl overflow-hidden shadow-2xl border-4 border-blue-500/20 group">
                        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent z-10" />
                        <Image
                            src="/academy-gallery-5.jpg"
                            alt="Winter Cup"
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute bottom-8 left-8 z-20">
                            <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-2 inline-block">Edición Invierno</span>
                            <h3 className="text-3xl font-heading font-bold text-white">El Torneo del Frío</h3>
                        </div>
                    </div>
                </div>

                {/* SUMMER CUP */}
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl border-4 border-gold/20 group">
                        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent z-10" />
                        <Image
                            src="/academy-gallery-3.jpg"
                            alt="Summer Cup"
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute bottom-8 left-8 z-20">
                            <span className="bg-gold text-navy px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-2 inline-block">Edición Verano</span>
                            <h3 className="text-3xl font-heading font-bold text-white">La Gran Fiesta del Fútbol</h3>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-gold/10 rounded-full">
                                <Sun className="h-8 w-8 text-gold" />
                            </div>
                            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white">Summer <span className="text-gold">Costa Brava Cup</span></h2>
                        </div>
                        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                            El evento del año. Equipos internacionales, sol, playa y fútbol. Una experiencia inolvidable para cerrar la temporada.
                        </p>
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-4 text-gray-300">
                                <Calendar className="h-6 w-6 text-gold" />
                                <span className="text-lg">Junio - Julio</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-300">
                                <MapPin className="h-6 w-6 text-gold" />
                                <span className="text-lg">Campos de Césped Natural</span>
                            </div>
                        </div>
                        <Button variant="outline" className="border-gold text-gold hover:bg-gold hover:text-navy uppercase font-bold tracking-widest">Ver Información</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
