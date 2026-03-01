import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar, MapPin, Check, Sun, Snowflake, Waves } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function CampusPage() {
    return (
        <div className="min-h-screen bg-navy text-white">
            {/* Hero Section */}
            <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
                <Image
                    src="/campus-hero-daytime.png"
                    alt="Campus Academy Costa Brava"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-navy/60 mix-blend-multiply" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent" />

                <div className="container relative z-10 text-center text-white">
                    <h1 className="font-heading text-5xl md:text-8xl font-extrabold mb-6 uppercase drop-shadow-2xl tracking-tight">
                        Formación de <span className="text-gold">Campus</span>
                    </h1>
                    <p className="text-xl md:text-3xl font-light max-w-3xl mx-auto mb-10 text-gray-200">
                        Experiencias intensivas de fútbol en la Costa Brava. <br />Verano e Invierno.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button size="lg" className="bg-gold hover:bg-gold-light text-navy font-bold text-xl px-8 py-6 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all font-heading uppercase tracking-widest" asChild>
                            <Link href="#verano">Verano</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="border-gold text-gold hover:bg-gold hover:text-navy font-bold text-xl px-8 py-6 rounded-full transition-all font-heading uppercase tracking-widest" asChild>
                            <Link href="#invierno">Invierno</Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container py-12 md:py-24 space-y-32">

                {/* SUMMER SECTION */}
                <div id="verano" className="scroll-mt-24">
                    <div className="grid md:grid-cols-2 gap-16 items-center mb-16">
                        <div className="order-2 md:order-1">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-gold/10 rounded-full">
                                    <Sun className="h-8 w-8 text-gold" />
                                </div>
                                <h2 className="font-heading text-4xl md:text-5xl font-bold text-white">Campus de <span className="text-gold">Verano</span></h2>
                            </div>
                            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                                Nuestro Campus de Verano "Estiu" combina entrenamientos de tecnificación por las mañanas con actividades lúdicas y acuáticas por las tardes en las mejores playas de la Costa Brava.
                            </p>
                            <ul className="space-y-6">
                                <li className="flex items-center gap-4 bg-navy-light/50 p-4 rounded-xl border border-white/5 hover:border-gold/30 transition-colors">
                                    <Waves className="h-6 w-6 text-blue-400" />
                                    <span className="font-heading font-semibold text-lg text-white">Fútbol + Playa</span>
                                </li>
                                <li className="flex items-center gap-4 bg-navy-light/50 p-4 rounded-xl border border-white/5 hover:border-gold/30 transition-colors">
                                    <MapPin className="h-6 w-6 text-green-400" />
                                    <span className="font-heading font-semibold text-lg text-white">Ubicaciones Exclusivas</span>
                                </li>
                            </ul>
                        </div>
                        <div className="order-1 md:order-2 relative h-[400px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-gold/10 group">
                            <Image
                                src="/campus-summer-kids.jpg"
                                alt="Campus Verano - Niños en la playa"
                                fill
                                className="object-cover transform group-hover:scale-110 transition-transform duration-700"
                            />
                        </div>
                    </div>

                    {/* Summer Pricing Cards (Simplified) */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <Card key={`summer-${i}`} className="bg-navy-light border-white/10 shadow-lg hover:border-gold/50 transition-all">
                                <CardHeader>
                                    <CardTitle className="font-heading text-xl text-gold">Turno {i} (Julio)</CardTitle>
                                    <CardDescription>Semana Completa</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white mb-4">250€</div>
                                    <Button className="w-full bg-navy border border-gold/30 hover:bg-gold hover:text-navy transition-all">Más Info</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* WINTER SECTION */}
                <div id="invierno" className="scroll-mt-24">
                    <div className="grid md:grid-cols-2 gap-16 items-center mb-16">
                        <div className="relative h-[400px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-blue-500/10 group">
                            <div className="absolute inset-0 bg-blue-900/40 mix-blend-overlay z-10" />
                            <Image
                                src="/campus-hero-new.png"
                                alt="Campus Invierno"
                                fill
                                className="object-cover transform group-hover:scale-110 transition-transform duration-700 grayscale-[30%]"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-blue-500/10 rounded-full">
                                    <Snowflake className="h-8 w-8 text-blue-400" />
                                </div>
                                <h2 className="font-heading text-4xl md:text-5xl font-bold text-white">Campus de <span className="text-blue-400">Invierno</span></h2>
                            </div>
                            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                                El Campus de Invierno "Hivern" se centra en la tecnificación pura y la preparación para la segunda vuelta de la temporada. Menos distracciones, más fútbol.
                            </p>
                            <ul className="space-y-6">
                                <li className="flex items-center gap-4 bg-navy-light/50 p-4 rounded-xl border border-white/5 hover:border-blue-400/30 transition-colors">
                                    <Check className="h-6 w-6 text-blue-400" />
                                    <span className="font-heading font-semibold text-lg text-white">Tecnificación Intensiva</span>
                                </li>
                                <li className="flex items-center gap-4 bg-navy-light/50 p-4 rounded-xl border border-white/5 hover:border-blue-400/30 transition-colors">
                                    <Check className="h-6 w-6 text-blue-400" />
                                    <span className="font-heading font-semibold text-lg text-white">Optimización del Rendimiento</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Winter Pricing Cards */}
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <Card className="bg-navy-light border-white/10 shadow-lg hover:border-blue-400/50 transition-all">
                            <CardHeader>
                                <CardTitle className="font-heading text-xl text-blue-400">Turno Diciembre</CardTitle>
                                <CardDescription>27 - 31 Diciembre</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white mb-4">180€</div>
                                <Button className="w-full bg-navy border border-blue-400/30 hover:bg-blue-400 hover:text-navy transition-all">Más Info</Button>
                            </CardContent>
                        </Card>
                        <Card className="bg-navy-light border-white/10 shadow-lg hover:border-blue-400/50 transition-all">
                            <CardHeader>
                                <CardTitle className="font-heading text-xl text-blue-400">Turno Enero</CardTitle>
                                <CardDescription>2 - 5 Enero</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white mb-4">150€</div>
                                <Button className="w-full bg-navy border border-blue-400/30 hover:bg-blue-400 hover:text-navy transition-all">Más Info</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    )
}
