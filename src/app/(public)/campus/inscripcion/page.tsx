
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import CampusForm from './campus-form'
export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({ title: 'Inscripción Campus Navidad 2026–2027' }, translate)
}
export default async function Page() {
    const translate = await getT()

    return <main className="min-h-screen bg-slate-50 py-14 text-navy"><div className="container max-w-3xl"><p className="font-bold uppercase tracking-widest text-amber-700">{translate("Academy Costa Brava · C. E. Cristinenc")}</p><h1 className="mt-3 font-heading text-4xl font-black uppercase md:text-6xl">{translate("Inscripción Campus")}<br />{translate("Navidad 2026–2027")}</h1><p className="mt-5 text-slate-600">{translate("Del 22 de diciembre al 7 de enero · 09:00–14:00 · Campo Municipal de Santa Cristina d’Aro. Nacidos de 2013 a 2022.")}</p><p className="mt-3 text-slate-600">{translate("Puedes inscribirte tengas o no cuenta en la academia. Completa un formulario por jugador. Secretaría confirmará la plaza y el pago.")}</p><CampusForm /></div></main>
}
