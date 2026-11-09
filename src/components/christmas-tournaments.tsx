import Image from 'next/image'
import Link from 'next/link'
import { christmasTournaments } from '@/lib/christmas-tournaments'

export function ChristmasTournaments() {
  return <section id="navidad" className="container scroll-mt-24 py-14 md:py-20">
    <p className="text-sm font-bold uppercase tracking-widest text-gold">Abierto a todos los jugadores</p>
    <h2 className="mt-3 text-4xl font-black md:text-6xl">Esta Navidad,<br /><span className="text-gold">juega con Academy.</span></h2>
    <p className="mt-5 max-w-2xl text-slate-300">Tres torneos. Un mismo equipo. Solicita tu plaza individual y nosotros organizamos los equipos. No necesitas ser alumno de la academia.</p>
    <div className="my-8 flex flex-wrap gap-3">{['1 torneo · 65 €', '2 torneos · 120 €', '3 torneos · 165 €'].map(s => <span key={s} className="rounded-xl border border-gold/40 bg-gold/10 px-5 py-3 font-bold text-gold">{s}</span>)}</div>
    <div className="grid gap-6 lg:grid-cols-3">{christmasTournaments.map(t => <article id={t.id} key={t.id} className="flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/5">
      <div className="relative h-52"><Image src={t.image} alt="Jugadores Academy en una experiencia de fútbol" fill className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-navy to-transparent" /><span className="absolute bottom-4 left-5 rounded-full bg-gold px-3 py-1 text-sm font-bold text-navy">Navidad 2026–2027</span></div>
      <div className="flex flex-1 flex-col p-6"><h3 className="text-3xl font-black">{t.name}</h3><p className="mt-3 font-semibold text-gold">{t.date}</p><p className="mt-2 text-sm text-slate-300">{t.location}</p><p className="mt-4 text-slate-200">{t.description}</p><p className="mt-4 text-sm font-semibold">{t.categories.join(' · ')}</p>
      <details className="my-5 text-sm text-slate-300"><summary className="cursor-pointer font-semibold text-gold">Fechas y qué incluye</summary><p className="mt-3">{t.dates}</p><p className="mt-3">{t.includes}</p></details>
      <Link href={`/torneos/inscripcion?torneo=${t.id}`} className="mt-auto rounded-xl bg-gold p-3 text-center font-bold text-navy">Inscribirme</Link></div>
    </article>)}</div>
    <div className="mt-10 overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 to-white/5 lg:grid lg:grid-cols-2">
      <div className="flex items-center bg-[#030d19] p-4"><Image src="/academy-tournament-kit.png" alt="Equipación azul Academy: camiseta, pantalón corto y calcetines" width={1536} height={768} className="h-auto w-full rounded-xl" /></div>
      <div className="p-6 md:p-9"><p className="text-xs font-bold uppercase tracking-widest text-gold">Viste los colores de tu equipo</p><h3 className="mt-3 text-3xl font-black">Tu equipación Academy</h3><p className="mt-4 text-4xl font-black text-gold">55 € <span className="text-sm font-medium text-slate-300">/ equipación completa</span></p><p className="mt-3 text-slate-200">Camiseta, pantalón corto y calcetines. Todo listo para representar a Academy dentro del campo.</p><p className="mt-4 text-sm leading-relaxed text-slate-300">La equipación Academy es obligatoria para participar en <strong className="text-white">231 Cup y Winter Costa Brava Cup</strong>. Si todavía no la tienes, deberás adquirirla al inscribirte y elegir tus tallas. Si ya la tienes, utiliza la tuya: no necesitas comprar otra.</p><p className="mt-3 text-sm text-slate-300">Un único pago de 55 € por jugador, aunque participe en ambos torneos. En <strong className="text-white">Champions Dream</strong> no es obligatorio comprarla.</p><Link href="/torneos/inscripcion" className="mt-6 inline-flex rounded-xl bg-gold px-5 py-3 font-bold text-navy">Elegir torneos y equipación</Link></div>
    </div>
    <div className="mt-7 rounded-2xl border border-white/15 p-6 text-sm leading-relaxed text-slate-300"><p>Si seleccionas 231 Cup y Champions Dream, revisaremos la compatibilidad antes del pago. No cobramos hasta validar tu solicitud e indicarte el importe definitivo. Pago por transferencia y subida de justificante.</p><p className="mt-3">¿Necesitas ayuda? <a className="text-gold underline" href="tel:+34654139429">654 139 429</a> · <a className="text-gold underline" href="mailto:costabravaacademy@gmail.com">costabravaacademy@gmail.com</a></p></div>
  </section>
}
