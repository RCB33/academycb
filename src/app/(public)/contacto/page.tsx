import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { MapPin, Phone, Mail } from "lucide-react"

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-navy text-white">
            <div className="container py-12 md:py-32">
                <div className="grid md:grid-cols-2 gap-16 items-start">
                    <div className="space-y-12">
                        <div>
                            <h1 className="font-heading text-5xl md:text-6xl font-extrabold mb-6 text-white uppercase">Contacto</h1>
                            <div className="w-24 h-2 bg-gold rounded-full mb-8"></div>
                            <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                                Estamos aquí para resolver cualquier duda. Ven a conocer nuestras instalaciones o escríbenos directamente.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-start gap-6 group">
                                <div className="p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <MapPin className="h-8 w-8 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">Ubicación</h3>
                                    <p className="text-gray-400 text-lg">Polideportivo Municipal<br />Calle del Deporte s/n, 28000 Madrid</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-6 group">
                                <div className="p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <Phone className="h-8 w-8 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">Teléfono / WhatsApp</h3>
                                    <p className="text-gray-400 text-lg">+34 600 000 000</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-6 group">
                                <div className="p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <Mail className="h-8 w-8 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">Email</h3>
                                    <p className="text-gray-400 text-lg">info@academiapro.com</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="p-8 md:p-10 bg-navy-light border-white/10 shadow-2xl">
                        <h2 className="font-heading text-3xl font-bold mb-8 text-white">Envíanos un mensaje</h2>
                        <form className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Nombre</label>
                                    <Input placeholder="Tu nombre" className="bg-navy border-white/10 text-white placeholder:text-gray-600 focus:border-gold/50 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Teléfono</label>
                                    <Input placeholder="600..." className="bg-navy border-white/10 text-white placeholder:text-gray-600 focus:border-gold/50 h-12" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Email</label>
                                <Input type="email" placeholder="ejemplo@email.com" className="bg-navy border-white/10 text-white placeholder:text-gray-600 focus:border-gold/50 h-12" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Mensaje</label>
                                <textarea
                                    className="flex min-h-[150px] w-full rounded-md border border-white/10 bg-navy px-4 py-3 text-sm text-white placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="¿En qué podemos ayudarte?"
                                />
                            </div>
                            <Button className="w-full h-12 text-lg font-heading font-bold uppercase tracking-wider bg-gold hover:bg-white hover:text-navy text-navy transition-all">Enviar Mensaje</Button>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    )
}
