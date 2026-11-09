import Link from 'next/link'
import { CalendarDays, Clock3, MapPin, Shield, Users } from 'lucide-react'

export const christmasSchedule = [
    ['09:00 – 09:15', 'Llegada'],
    ['09:15 – 10:45', 'Tecnificación'],
    ['10:45 – 11:15', 'Almuerzo'],
    ['11:15 – 12:30', 'Juegos de fútbol'],
    ['12:30 – 13:45', 'Competición · partidos'],
    ['13:45 – 14:00', 'Recogida'],
]

export function ChristmasCampus() {
    const enrollmentHref = '/campus/inscripcion'
    return <section id="campus-navidad" className="container scroll-mt-24 py-20 md:py-28">
        <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-gold">Academy Costa Brava · C. E. Cristinenc</p>
            <h2 className="mt-3 font-heading text-5xl font-black uppercase leading-tight md:text-7xl">Campus de Navidad<br /><span className="text-gold">2026 — 2027</span></h2>
            <p className="mt-5 text-lg text-slate-300">Juega, disfruta y siente el fútbol. Tecnificación, juegos y partidos cada día, con un espacio propio para los porteros dentro del campus.</p>
        </div>
        <div className="my-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[[CalendarDays, '22 diciembre — 7 enero'], [Clock3, 'De 09:00 a 14:00'], [Users, 'Nacidos de 2013 a 2022'], [MapPin, 'Campo Municipal de Santa Cristina d’Aro']].map(([Icon, label]) => {
                const ItemIcon = Icon as typeof CalendarDays
                return <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm font-bold"><ItemIcon className="h-5 w-5 shrink-0 text-gold" />{String(label)}</div>
            })}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-white/15 bg-white/5 p-6 md:p-8">
                <h3 className="font-heading text-3xl font-black uppercase">Horario diario</h3>
                <p className="mt-2 text-sm text-slate-300">Llegada puntual a las 9:00.</p>
                <ol className="mt-6 divide-y divide-white/10">{christmasSchedule.map(([time, activity]) => <li key={time} className="grid grid-cols-[8rem_1fr] gap-3 py-4 text-sm"><span className="font-bold text-gold">{time}</span><span>{activity}</span></li>)}</ol>
            </article>
            <article className="rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/15 to-navy-light p-6 md:p-8">
                <Shield className="h-9 w-9 text-gold" />
                <h3 className="mt-5 font-heading text-3xl font-black uppercase">Porteros, dentro<br /><span className="text-gold">del mismo campus.</span></h3>
                <p className="mt-5 leading-relaxed text-slate-200">Durante la franja de tecnificación, los porteros trabajan técnica específica de portería. El resto del día comparten las actividades con todos los participantes.</p>
                <div className="mt-6 space-y-3"><p className="rounded-xl bg-navy/60 p-4"><strong className="block text-gold">09:15 – 10:45</strong>Tecnificación de porteros</p><p className="rounded-xl bg-navy/60 p-4"><strong className="block text-gold">11:15 – 13:45</strong>Juegos y competición con el campus</p></div>
            </article>
        </div>
        <h3 className="mt-12 font-heading text-3xl font-black uppercase">Precios e inscripción</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
                { title: 'Semana de 3 días', price: '89 €', detail: '22, 23 y 24 de diciembre · o 4, 5 y 7 de enero', featured: false },
                { title: 'Semana de 4 días', price: '99 €', detail: '28, 29, 30 y 31 de diciembre', featured: false },
                { title: 'Pack completo', price: '197 €', detail: 'Las 3 semanas · sudadera incluida', featured: true },
            ].map(plan => <article key={plan.title} className={`rounded-3xl border p-6 ${plan.featured ? 'border-gold bg-gold text-navy' : 'border-white/15 bg-white/5'}`}><h4 className="font-heading text-xl font-bold uppercase">{plan.title}</h4><p className="my-5 font-heading text-6xl font-black">{plan.price}</p><p className="text-sm leading-relaxed">{plan.detail}</p></article>)}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><p className="rounded-2xl border border-gold/30 p-5"><strong className="text-gold">−5 % para el segundo hermano inscrito.</strong></p><p className="rounded-2xl border border-gold/30 p-5">El pack completo ahorra <strong className="text-gold">80 €</strong> frente a los 277 € por separado. Sudadera incluida solo con el pack completo.</p></div>
        <div className="mt-8 rounded-3xl bg-white/5 p-6 md:p-8">
            <h3 className="font-heading text-3xl font-black uppercase">Tu plaza en el campus</h3>
            <p className="mt-3 max-w-3xl text-slate-300">Tengas o no cuenta en la academia, puedes solicitar la inscripción. Indica la semana o pack y si el jugador participa como portero. Secretaría confirmará la disponibilidad y el importe.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link href={enrollmentHref || 'https://wa.me/34691179600?text=Hola%2C%20quiero%20inscribirme%20en%20el%20Campus%20de%20Navidad%202026-2027.'} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-6 font-bold text-navy">{enrollmentHref ? 'Solicitar inscripción' : 'Solicitar inscripción por WhatsApp'}</Link><Link href="/portal" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-6 font-bold">Ya tengo acceso · Portal familias</Link></div>
            <p className="mt-4 text-sm text-slate-400">Información e inscripciones: <a href="tel:+34691179600" className="text-gold underline">691 17 96 00</a> · @academy.costabrava</p>
        </div>
    </section>
}
