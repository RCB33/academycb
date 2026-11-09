import CampusForm from './campus-form'
export const metadata = { title: 'Inscripción Campus Navidad 2026–2027' }
export default function Page() {
    return <main className="min-h-screen bg-slate-50 py-14 text-navy"><div className="container max-w-3xl"><p className="font-bold uppercase tracking-widest text-amber-700">Academy Costa Brava · C. E. Cristinenc</p><h1 className="mt-3 font-heading text-4xl font-black uppercase md:text-6xl">Inscripción Campus<br />Navidad 2026–2027</h1><p className="mt-5 text-slate-600">Del 22 de diciembre al 7 de enero · 09:00–14:00 · Campo Municipal de Santa Cristina d’Aro. Nacidos de 2013 a 2022.</p><p className="mt-3 text-slate-600">Puedes inscribirte tengas o no cuenta en la academia. Completa un formulario por jugador. Secretaría confirmará la plaza y el pago.</p><CampusForm /></div></main>
}
