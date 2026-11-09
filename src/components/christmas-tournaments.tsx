import Image from 'next/image'
import Link from 'next/link'
import { christmasTournaments } from '@/lib/christmas-tournaments'

export function ChristmasTournaments() {
  return <section id="navidad" className="container scroll-mt-24 py-14 md:py-20">
    <p className="text-sm font-bold uppercase tracking-widest text-gold">Abierto a todos los jugadores</p>
    <h2 className="mt-3 text-4xl font-black md:text-6xl">Esta Navidad,<br /><span className="text-gold">juega con Academy.</span></h2>
    <p className="mt-5 max-w-2xl text-slate-300">Tres torneos. Un mismo equipo. Solicita tu plaza individual y nosotros organizamos los equipos. No necesitas ser alumno de la academia.</p>
    <div className="my-6 md:my-8" aria-label="Precios de los torneos de Navidad">
      <p className="mb-4 text-xl font-bold text-white">Más fútbol. Más ahorro.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div className="flex flex-col rounded-2xl border border-gold/30 bg-white/5 p-3.5 md:p-6">
          <h3 className="text-sm font-bold text-white md:text-lg">1 torneo</h3>
          <p className="mt-1 hidden text-sm text-slate-300 md:block">Elige tu cita con el fútbol.</p>
          <p className="mt-3 text-3xl font-black text-white md:mt-5 md:text-5xl">65 €<span className="mt-1 block text-xs font-medium text-slate-300 md:ml-1 md:mt-0 md:inline md:text-sm">/ torneo</span></p>
          <p className="mt-2 text-xs text-slate-300 md:mt-3 md:text-sm">65 € en total<span className="hidden md:inline"> por jugador</span></p>
        </div>
        <div className="flex flex-col rounded-2xl border border-gold/30 bg-white/5 p-3.5 md:p-6">
          <h3 className="text-sm font-bold text-white md:text-lg"><span className="hidden md:inline">Pack de </span>2 torneos</h3>
          <p className="mt-1 hidden text-sm text-slate-300 md:block">Dobla la experiencia.</p>
          <p className="mt-3 text-3xl font-black text-white md:mt-5 md:text-5xl">60 €<span className="mt-1 block text-xs font-medium text-slate-300 md:ml-1 md:mt-0 md:inline md:text-sm">/ torneo</span></p>
          <p className="mt-2 text-xs text-slate-300 md:mt-3 md:text-sm">120 € en total<span className="hidden md:inline"> por jugador</span></p>
          <p className="mt-2 text-xs font-bold text-gold md:mt-4 md:text-sm">Ahorras 10 €<span className="hidden md:inline"> en total</span></p>
        </div>
        <div className="order-first col-span-2 flex flex-col rounded-2xl border border-gold bg-gradient-to-br from-gold-light to-gold p-4 text-navy shadow-lg shadow-gold/10 md:order-none md:col-span-1 md:p-6">
          <span className="mb-2 self-start md:mb-4 rounded-full bg-navy px-3 py-1 text-xs font-black uppercase tracking-wide text-gold">Recomendado</span>
          <h3 className="text-lg font-bold">Pack de 3 torneos</h3>
          <p className="mt-1 hidden text-sm md:block">Vive la Navidad completa con Academy.</p>
          <p className="mt-3 text-5xl font-black md:mt-5 md:text-6xl">55 €<span className="ml-1 text-sm font-semibold">/ torneo</span></p>
          <p className="mt-2 text-xs md:mt-3 md:text-sm"><span className="sr-only">Por separado: </span><s className="mr-2">195 €</s><strong>165 € en total por jugador</strong></p>
          <div className="my-3 rounded-xl border border-navy/15 bg-white/30 px-3 py-2 md:my-5 md:p-4">
            <p className="text-lg font-black md:text-2xl">Ahorras 30 €</p>
            <p className="text-xs font-semibold md:mt-1 md:text-sm">10 € menos en cada torneo.</p>
          </div>
          <Link href="/torneos/inscripcion" className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-center text-sm font-bold md:min-h-12 md:py-3 md:text-base text-white transition hover:bg-navy-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy">Quiero el pack de 3 <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">Ahorro respecto a 65 € por torneo suelto. Precios por jugador. Equipación no incluida: 55 € únicamente si la necesitas para 231 Cup o Winter Costa Brava Cup.</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-3">{christmasTournaments.map(t => <article id={t.id} key={t.id} className="flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/5">
      <div className="relative h-52"><Image src={t.image} alt="Jugadores Academy en una experiencia de fútbol" fill className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-navy to-transparent" /><span className="absolute bottom-4 left-5 rounded-full bg-gold px-3 py-1 text-sm font-bold text-navy">Navidad 2026–2027</span></div>
      <div className="flex flex-1 flex-col p-6"><h3 className="text-3xl font-black">{t.name}</h3><p className="mt-3 font-semibold text-gold">{t.date}</p><p className="mt-2 text-sm text-slate-300">{t.location}</p><p className="mt-4 text-slate-200">{t.description}</p><p className="mt-4 text-sm font-semibold">{t.categories.join(' · ')}</p>
      <details className="my-5 text-sm text-slate-300"><summary className="cursor-pointer font-semibold text-gold">Fechas y qué incluye</summary><p className="mt-3">{t.dates}</p><p className="mt-3">{t.includes}</p></details>
      <p className="mb-4 font-bold text-gold">65 € por jugador <span className="block text-xs font-normal text-slate-300">Precio especial al combinar varios torneos</span></p>
      <Link href={`/torneos/inscripcion?torneo=${t.id}`} className="mt-auto rounded-xl bg-gold p-3 text-center font-bold text-navy">Solicitar plaza</Link></div>
    </article>)}</div>
    <div className="mt-10 overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 to-white/5 lg:grid lg:grid-cols-2">
      <div className="flex items-center bg-[#030d19] p-4"><Image src="/academy-tournament-kit.png" alt="Equipación azul Academy: camiseta, pantalón corto y calcetines" width={1536} height={768} className="h-auto w-full rounded-xl" /></div>
      <div className="p-6 md:p-9"><p className="text-xs font-bold uppercase tracking-widest text-gold">Viste los colores de tu equipo</p><h3 className="mt-3 text-3xl font-black">Tu equipación Academy</h3><p className="mt-4 text-4xl font-black text-gold">55 € <span className="text-sm font-medium text-slate-300">/ equipación completa</span></p><p className="mt-3 text-slate-200">Camiseta, pantalón corto y calcetines. Todo listo para representar a Academy dentro del campo.</p><p className="mt-4 text-sm leading-relaxed text-slate-300">La equipación Academy es obligatoria para participar en <strong className="text-white">231 Cup y Winter Costa Brava Cup</strong>. Si todavía no la tienes, deberás adquirirla al inscribirte y elegir tus tallas. Si ya la tienes, utiliza la tuya: no necesitas comprar otra.</p><p className="mt-3 text-sm text-slate-300">Un único pago de 55 € por jugador, aunque participe en ambos torneos. En <strong className="text-white">Champions Dream</strong> no es obligatorio comprarla.</p><Link href="/torneos/inscripcion" className="mt-6 inline-flex rounded-xl bg-gold px-5 py-3 font-bold text-navy">Elegir torneos y equipación</Link></div>
    </div>
    <div className="mt-12"><h3 className="text-3xl font-black">Del primer clic al terreno de juego.</h3><p className="mt-3 text-slate-300">Así de sencillo es solicitar tu plaza con Academy.</p>
      <ol className="mt-6 grid gap-4 md:grid-cols-3">{[
        { title: 'Elige y solicita', text: 'Selecciona tus torneos. Entra con tu cuenta o verifica tu correo para crearla. Si tu hijo ya tiene ficha vinculada, podrás seleccionarlo sin volver a introducir todos sus datos.' },
        { title: 'Revisamos tu solicitud', text: 'Academy comprueba la categoría, el equipo y la disponibilidad. Consulta la respuesta y el importe definitivo en Mis inscripciones. Todavía no hagas la transferencia.' },
        { title: 'Pago y confirmación', text: 'Cuando aprobemos la solicitud, verás los datos para la transferencia. Sube el justificante en tu inscripción. Confirmaremos la plaza después de comprobar el ingreso.' },
      ].map((step, index) => <li key={step.title} className="rounded-2xl border border-white/15 bg-white/5 p-6"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-black text-navy">{index + 1}</span><h4 className="mt-4 text-xl font-bold">{step.title}</h4><p className="mt-3 text-sm leading-relaxed text-slate-300">{step.text}</p></li>)}</ol>
    </div>
    <div className="mt-12"><h3 className="text-3xl font-black">Resolvemos tus dudas.</h3><div className="mt-5 divide-y divide-white/15">{[
      { question: '¿Puede apuntarse un jugador que no sea de Academy?', answer: 'Sí. Estas convocatorias están abiertas a todos los jugadores, sean de otras academias, de otros clubes o no tengan equipo. La plaza se valida según la categoría, el equipo y la disponibilidad.' },
      { question: '¿Puedo elegir varios torneos?', answer: 'Sí: un torneo cuesta 65 €, dos 120 € y tres 165 € por jugador. Si eliges 231 Cup y Champions Dream, revisaremos las posibles coincidencias del día 27 antes del pago. Si hay que cambiar la selección, recalcularemos el importe.' },
      { question: '¿Necesito comprar equipación?', answer: 'Para 231 Cup y Winter Costa Brava Cup debes llevar la equipación Academy. Si ya la tienes, utiliza la tuya. Si no, el conjunto de camiseta, pantalón y calcetines cuesta 55 €, una sola vez por jugador. Para Champions Dream no es obligatorio comprarla.' },
      { question: '¿Enviar el formulario o el justificante confirma mi plaza?', answer: 'No. El formulario es una solicitud. Primero Academy debe validarla; después, tendrás que realizar la transferencia y adjuntar el justificante. La plaza queda confirmada cuando comprobamos el ingreso y tu inscripción aparece como confirmada.' },
      { question: '¿Dónde consultaré los horarios y mi inscripción?', answer: 'Los campos y horarios concretos que todavía no están cerrados se comunicarán cuando estén confirmados. Para consultar tu solicitud, vuelve a entrar con el mismo correo y abre Mis inscripciones.' },
    ].map(faq => <details key={faq.question} className="py-5"><summary className="cursor-pointer text-base font-bold text-white">{faq.question}</summary><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{faq.answer}</p></details>)}</div></div>
    <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl border border-gold/30 bg-gold/10 p-6 sm:flex-row sm:items-center"><div><h3 className="text-xl font-bold">¿Preparado para vivirlo con Academy?</h3><p className="mt-2 text-sm text-slate-300">Solicita tu plaza o vuelve para consultar tu inscripción.</p></div><Link href="/torneos/inscripcion" className="shrink-0 rounded-xl bg-gold px-5 py-3 text-center font-bold text-navy">Inscribirme / Ya tengo cuenta</Link></div>
    <p className="mt-6 text-sm text-slate-300">¿Necesitas ayuda? <a className="text-gold underline" href="tel:+34654139429">654 139 429</a> · <a className="text-gold underline" href="mailto:costabravaacademy@gmail.com">costabravaacademy@gmail.com</a></p>
  </section>
}
