import { Card } from "@/components/ui/card"
import { MapPin, Phone, Mail } from "lucide-react"
import { getPublicSettings } from "@/lib/public-settings"
import { ContactForm } from "./contact-form"

export const metadata = {
    title: 'Contacto',
    description: 'Contacta con Academy Costa Brava para solicitar información sobre academia, campus y torneos.'
}

export default async function ContactPage() {
    const settings = await getPublicSettings()
    const phone = settings.academy_phone || ''
    const email = settings.academy_email || ''
    const address = settings.academy_address || ''
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
                            {address && <div className="flex items-start gap-6 group">
                                <div className="p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <MapPin className="h-8 w-8 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">Ubicación</h3>
                                    <p className="text-gray-400 text-lg">{address}</p>
                                </div>
                            </div>}
                            {phone && <div className="flex items-start gap-6 group">
                                <div className="p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <Phone className="h-8 w-8 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">Teléfono / WhatsApp</h3>
                                    <a className="text-gray-400 text-lg hover:text-gold" href={`tel:${phone}`}>{phone}</a>
                                </div>
                            </div>}
                            {email && <div className="flex items-start gap-6 group">
                                <div className="p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <Mail className="h-8 w-8 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">Email</h3>
                                    <a className="text-gray-400 text-lg hover:text-gold" href={`mailto:${email}`}>{email}</a>
                                </div>
                            </div>}
                            {!address && !phone && !email && <p className="text-gray-400">Utiliza el formulario y te responderemos lo antes posible.</p>}
                        </div>
                    </div>

                    <Card className="p-8 md:p-10 bg-navy-light border-white/10 shadow-2xl">
                        <h2 className="font-heading text-3xl font-bold mb-8 text-white">Envíanos un mensaje</h2>
                        <ContactForm />
                    </Card>
                </div>
            </div>
        </div>
    )
}
