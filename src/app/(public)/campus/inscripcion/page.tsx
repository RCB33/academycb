import { getCampusOffer } from '@/lib/offering-server'
import Link from 'next/link'

import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import CampusForm from './campus-form'
export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({ title: 'Inscripción Campus Navidad 2026–2027' }, translate)
}
export default async function Page({searchParams}:{searchParams:Promise<{edition?:string}>}) {
    const translate = await getT()
    const campus=await getCampusOffer((await searchParams).edition)
    if(!campus||campus.end_date<new Date().toISOString().slice(0,10)) return <main className="container py-20"><h1 className="text-3xl font-bold">Esta edición no admite solicitudes</h1><Link href="/campus" className="mt-5 block underline">Consultar campus disponibles</Link></main>
    return <main className="min-h-screen bg-slate-50 py-14 text-navy"><div className="container max-w-3xl"><p className="font-bold uppercase tracking-widest text-amber-700">{translate("Academy Costa Brava · C. E. Cristinenc")}</p><h1 className="mt-3 font-heading text-4xl font-black uppercase md:text-6xl">{translate("Inscripción Campus")}<br />{campus.name}</h1><p className="mt-5 text-slate-600">{campus.start_date} – {campus.end_date} · {campus.schedule} · {campus.location}. Nacidos de {campus.public_program.birth_from} a {campus.public_program.birth_to}.</p><p className="mt-3 text-slate-600">{translate("Puedes inscribirte tengas o no cuenta en la academia. Completa un formulario por jugador. Secretaría confirmará la plaza y el pago.")}</p><CampusForm campus={campus} /></div></main>
}
