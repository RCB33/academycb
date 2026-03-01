import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "lucide-react"
import Image from "next/image"
import { CarouselCustom } from "@/components/ui/carousel-custom"

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

    return (
        <div className="min-h-screen bg-navy text-white">
            {/* Hero Section */}
            <div className="relative py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/bg-texture.png')] opacity-10 mix-blend-overlay"></div> {/* Optional texture helper */}
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
                                    <p className="text-gray-400">Coordinación, velocidad y prevención de lesiones con tecnología biométrica.</p>
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

                {/* Plans Section */}
                <div className="text-center mb-16">
                    <h2 className="font-heading text-4xl font-bold mb-6 text-white">Planes de Formación</h2>
                    <p className="text-xl text-gray-300">Elige la opción que mejor se adapte a tus necesidades.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Monthly Plan */}
                    <Card className="bg-navy-light border-white/10 text-white hover:border-gold/50 transition-all hover:-translate-y-2 duration-300">
                        <CardHeader>
                            <CardTitle className="text-2xl font-heading text-gold">Mensual</CardTitle>
                            <CardDescription className="text-gray-400">Flexibilidad total</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold mb-2">40€<span className="text-sm font-normal text-gray-400">/mes</span></div>
                            <p className="text-sm text-gray-300 mt-4 border-t border-white/10 pt-4">Pago mes a mes sin compromiso de permanencia.</p>
                        </CardContent>
                    </Card>

                    {/* Quarterly Plan */}
                    <Card className="bg-gradient-to-b from-navy to-navy-light border-gold text-white relative overflow-hidden transform scale-105 shadow-2xl shadow-gold/10">
                        <div className="absolute top-0 right-0 bg-gold text-navy font-bold text-xs px-3 py-1 rounded-bl-lg">POPULAR</div>
                        <CardHeader>
                            <CardTitle className="text-3xl font-heading text-gold">Trimestral</CardTitle>
                            <CardDescription className="text-gray-300">Compromiso y ahorro</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold mb-2">110€<span className="text-sm font-normal text-gray-400">/trimestre</span></div>
                            <p className="text-sm text-gray-300 mt-4 border-t border-white/10 pt-4">Ahorra un mes al año. Ideal para evaluaciones periódicas.</p>
                        </CardContent>
                    </Card>

                    {/* Annual Plan */}
                    <Card className="bg-navy-light border-white/10 text-white hover:border-gold/50 transition-all hover:-translate-y-2 duration-300">
                        <CardHeader>
                            <CardTitle className="text-2xl font-heading text-gold">Anual</CardTitle>
                            <CardDescription className="text-gray-400">La mejor opción</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold mb-2">400€<span className="text-sm font-normal text-gray-400">/temporada</span></div>
                            <p className="text-sm text-gray-300 mt-4 border-t border-white/10 pt-4">Pago único. Incluye equipación de regalo.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
