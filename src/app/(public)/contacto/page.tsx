
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import { Card } from "@/components/ui/card"
import { MapPin, Phone, Mail } from "lucide-react"
import { getPublicSettings } from "@/lib/public-settings"
import { ContactForm } from "./contact-form"

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({
    title: 'Contacto',
    description: 'Contacta con Academy Costa Brava para solicitar información sobre academia, campus y torneos.'
}, translate)
}

export default async function ContactPage() {
    const translate = await getT()

    const settings = await getPublicSettings()
    const phone = settings.academy_phone || ''
    const email = settings.academy_email || ''
    const address = settings.academy_address || ''
    return (
        <div className="min-h-screen bg-navy text-white">
            <div className="container py-12 md:py-32">
                <div className="grid min-w-0 md:grid-cols-2 gap-10 lg:gap-16 items-start">
                    <div className="space-y-12">
                        <div>
                            <h1 className="font-heading text-5xl md:text-6xl font-extrabold mb-6 text-white uppercase">{translate("Contacto")}</h1>
                            <div className="w-24 h-2 bg-gold rounded-full mb-8"></div>
                            <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                                {translate("Estamos aquí para resolver cualquier duda. Ven a conocer nuestras instalaciones o escríbenos directamente.")}</p>
                        </div>

                        <div className="space-y-8">
                            {translate(address && <div className="flex min-w-0 items-start gap-3 sm:gap-6 group">
                                <div className="shrink-0 p-3 sm:p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <MapPin className="h-8 w-8 text-gold" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">{translate("Ubicación")}</h3>
                                    <p className="break-words text-gray-400 text-base sm:text-lg">{translate(address)}</p>
                                </div>
                            </div>)}
                            {translate(phone && <div className="flex min-w-0 items-start gap-3 sm:gap-6 group">
                                <div className="shrink-0 p-3 sm:p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <Phone className="h-8 w-8 text-gold" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">{translate("Teléfono / WhatsApp")}</h3>
                                    <a className="break-words text-gray-400 text-base sm:text-lg hover:text-gold" href={`tel:${phone}`}>{translate(phone)}</a>
                                </div>
                            </div>)}
                            {translate(email && <div className="flex min-w-0 items-start gap-3 sm:gap-6 group">
                                <div className="shrink-0 p-3 sm:p-4 rounded-xl bg-navy-light border border-white/10 group-hover:border-gold/50 transition-colors">
                                    <Mail className="h-8 w-8 text-gold" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-heading text-2xl font-bold mb-2 text-white group-hover:text-gold transition-colors">{translate("Email")}</h3>
                                    <a className="break-words text-gray-400 text-base sm:text-lg hover:text-gold" href={`mailto:${email}`}>{translate(email)}</a>
                                </div>
                            </div>)}
                            {translate(!address && !phone && !email && <p className="text-gray-400">{translate("Utiliza el formulario y te responderemos lo antes posible.")}</p>)}
                        </div>
                    </div>

                    <Card className="min-w-0 p-5 sm:p-8 md:p-10 bg-navy-light border-white/10 shadow-2xl">
                        <h2 className="font-heading text-3xl font-bold mb-8 text-white">{translate("Envíanos un mensaje")}</h2>
                        <ContactForm />
                    </Card>
                </div>
            </div>
        </div>
    )
}
