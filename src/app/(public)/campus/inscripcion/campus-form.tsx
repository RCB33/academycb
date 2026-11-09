'use client'
import { useT } from '@/lib/i18n/client'

import { useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { campusWeeks, campusPrice, participationTerms } from '@/lib/campus-registration'
const inputClass = 'mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-navy'
function Field({ name, label, type = 'text', required = true, ...props }: { name: string; label: string; type?: string; required?: boolean; min?: string; max?: string; maxLength?: number }) {
    const translate = useT()
 return <label className="block text-sm font-semibold">{translate(label)}{translate(required ? ' *' : '')}<input name={name} type={type} required={required} maxLength={150} className={inputClass} {...props} /></label> }
function Section({ title, children }: { title: string; children: ReactNode }) {
    const translate = useT()
 return <fieldset className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8"><legend className="rounded-lg bg-navy px-4 py-2 font-heading text-xl font-bold text-white">{translate(title)}</legend>{translate(children)}</fieldset> }
function Choice({ name, label }: { name: string; label: string }) {
    const translate = useT()
 return <label className="block text-sm font-semibold">{translate(label)} {translate(" *")}<select name={name} required defaultValue="" className={inputClass}><option value="" disabled>{translate("Selecciona una opción")}</option><option value="Sí">{translate("Sí")}</option><option value="No">{translate("No")}</option></select></label> }
function Accept({ name, children }: { name: string; children: ReactNode }) {
    const translate = useT()
 return <label className="flex items-start gap-3 text-sm leading-relaxed"><input name={name} type="checkbox" required className="mt-1 h-5 w-5 shrink-0 accent-amber-600" /><span>{translate(children)} {translate(" *")}</span></label> }
export default function CampusForm() {
    const translate = useT()

    const [weeks, setWeeks] = useState<string[]>([])
    const [sibling, setSibling] = useState(false)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); setError('')
        if (!weeks.length) { setError('Selecciona al menos una semana.'); return }
        setPending(true)
        const fd = new FormData(e.currentTarget)
        const data = Object.fromEntries(fd)
        try {
            const res = await fetch('/api/campus-enrollment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, weeks, sibling, sibling_name: data.sibling_name || '', size: data.size || '', payment_consent: fd.has('payment_consent'), privacy_consent: fd.has('privacy_consent'), health_consent: fd.has('health_consent'), terms_consent: fd.has('terms_consent') }) })
            const result = await res.json()
            if (!res.ok || !result.success) throw new Error(result.error || 'No se ha podido enviar.')
            setSuccess(true)
        } catch (err) { setError(err instanceof Error ? err.message : 'Error de conexión. Inténtalo de nuevo.') } finally { setPending(false) }
    }
    if (success) return <div className="my-10 rounded-2xl border border-green-300 bg-green-50 p-8" role="status"><h2 className="text-3xl font-bold">{translate("Inscripción recibida")}</h2><p className="mt-4">{translate("Secretaría revisará tu solicitud y confirmará plaza e importe. El envío del formulario no acredita el pago.")}</p><p className="mt-3">{translate("Si ya has realizado la transferencia, envía el comprobante al ")}<a className="underline" href="https://wa.me/34691179600">{translate("691 17 96 00 por WhatsApp")}</a>{translate(".")}</p><Link href="/campus" className="mt-6 inline-block font-bold underline">{translate("Volver a Campus")}</Link></div>
    return <form onSubmit={submit} className="mt-10 space-y-8">
        <p className="text-sm text-slate-600">{translate("Los campos con * son obligatorios.")}</p>
        <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
        <Section title={translate("1 · Datos del jugador")}><Field name="child_name" label={translate("Nombre y apellidos")} /><Field name="birth_date" label={translate("Fecha de nacimiento")} type="date" min="2013-01-01" max="2022-12-31" /><Field name="team" label={translate("Equipo actual (indica «Sin equipo» si corresponde)")} /><label className="block text-sm font-semibold">{translate("Modalidad dentro del campus *")}<select name="role" className={inputClass}><option value="Jugador de campo">{translate("Jugador de campo")}</option><option value="Portero">{translate("Portero")}</option></select></label></Section>
        <Section title={translate("2 · Tutor legal")}><Field name="guardian_name" label={translate("Nombre y apellidos del tutor legal")} /><Field name="phone" label={translate("Teléfono de contacto")} type="tel" /><Field name="email" label={translate("Correo electrónico")} type="email" /></Section>
        <Section title={translate("3 · Salud")}><Field name="allergies" label={translate("Alergias conocidas (indica «Ninguna» si corresponde)")} maxLength={1000} /><Field name="health_card" label={translate("Número de tarjeta sanitaria")} maxLength={80} /><Choice name="medical_consent" label={translate("¿Autorizas asistencia médica si es necesaria?")} /><Accept name="health_consent">{translate("Autorizo el tratamiento de estos datos de salud para atender al jugador durante el campus.")}</Accept></Section>
        <Section title={translate("4 · Semanas y pack")}><p className="text-sm text-slate-600">{translate("Selecciona las semanas. Al elegir las tres se aplica el pack de 197 €, con sudadera incluida y un ahorro de 80 €.")}</p>{translate(campusWeeks.map(w => <label key={w.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={weeks.includes(w.id)} onChange={e => setWeeks(e.target.checked ? [...weeks,w.id] : weeks.filter(v => v !== w.id))} className="h-5 w-5 accent-amber-600" /><span className="flex-1">{translate("Semana ")}{translate(w.id)}{translate(": ")}{translate(w.label)}</span><strong>{translate(w.price)} {translate(" €")}</strong></label>))}<button type="button" onClick={() => setWeeks(['1','2','3'])} className="rounded-xl bg-gold px-5 py-3 font-bold">{translate("Elegir pack completo · 197 €")}</button><p className="text-2xl font-bold" aria-live="polite">{translate("Tarifa: ")}{translate(campusPrice(weeks))} {translate(" €")}</p><label className="flex gap-3 text-sm"><input type="checkbox" checked={sibling} onChange={e => setSibling(e.target.checked)} />{translate("Es el segundo hermano inscrito (5 % de descuento, sujeto a comprobación).")}</label>{translate(sibling && <Field name="sibling_name" label={translate("Nombre del hermano ya inscrito")} />)}<Field name="preferences" label={translate("Combinación de semanas o preferencias")} required={false} maxLength={1000} /></Section>
        <Section title={translate("5 · Equipación")}><p className="text-sm">{translate("Sudadera incluida únicamente con el pack completo.")}</p><Field name="size" label={translate("Talla de sudadera infantil o adulto (ej. infantil 12, adulto M)")} required={weeks.length === 3} maxLength={40} /></Section>
        <Section title={translate("6 · Pago")}><p>{translate("Transferencia bancaria: ")}<strong className="block break-all">{translate("ES06 2100 6176 9202 0007 2768")}</strong></p><p className="text-sm">{translate("Envía el comprobante por WhatsApp al ")}<a href="https://wa.me/34691179600" className="font-bold underline">{translate("691 17 96 00")}</a>{translate(". Indica el nombre del jugador. Secretaría comprobará el ingreso y confirmará la plaza.")}</p><Accept name="payment_consent">{translate("He leído y acepto las condiciones de pago.")}</Accept></Section>
        <Section title={translate("7 · Imagen y privacidad")}><p className="text-sm leading-relaxed">{translate("Durante el Campus de Navidad se podrán realizar fotografías o grabaciones con fines informativos, promocionales y de difusión de las actividades de Academy Costa Brava. Puedes rechazar este uso sin impedir la inscripción.")}</p><Choice name="image_consent" label={translate("¿Autorizas la captación y uso de imágenes del jugador en estos términos?")} /><p className="text-sm leading-relaxed">{translate("Academy Costa Brava tratará los datos facilitados para gestionar la participación en el campus y la comunicación con las familias, con medidas de seguridad adecuadas y sin cesión a terceros excepto por obligación legal. Puedes solicitar acceso, rectificación, supresión, oposición y portabilidad en ")}<a href="mailto:costabravaacademy@gmail.com" className="underline">{translate("costabravaacademy@gmail.com")}</a>{translate(".")}</p><Accept name="privacy_consent">{translate("He leído y acepto la ")}<Link href="/privacidad" target="_blank" className="underline">{translate("política de privacidad")}</Link> {translate(" y el tratamiento de datos descrito.")}</Accept></Section>
        <Section title={translate("8 · Tu experiencia")}><label className="block text-sm font-semibold">{translate("¿Por qué habéis elegido el campus? *")}<select name="reason" required defaultValue="" className={inputClass}><option value="" disabled>{translate("Selecciona un motivo")}</option>{translate(['Calidad de los entrenamientos', 'Evolución del jugador', 'Ambiente y experiencia', 'Organización y confianza', 'Recomendación', 'Otros'].map(v => <option key={v} value={v}>{translate(v)}</option>))}</select></label><Field name="expectations" label={translate("¿Qué esperáis que vuestro hijo/a se lleve de esta experiencia?")} maxLength={1000} /></Section>
        <Section title={translate("9 · Condiciones de participación")}><p className="text-sm">{translate("Campus de Navidad 2026–2027 · Academy Costa Brava")}</p>{translate(participationTerms.map(([title,text],i) => <div key={title}><h3 className="font-bold">{translate(i+1)}{translate(". ")}{translate(title)}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{translate(text)}</p></div>))}<Accept name="terms_consent">{translate("He leído y acepto las condiciones de participación.")}</Accept></Section>
        {translate(error && <p role="alert" className="rounded-xl bg-red-50 p-4 font-semibold text-red-800">{translate(error)}</p>)}
        <button type="submit" disabled={pending} className="min-h-14 w-full rounded-xl bg-gold px-6 py-4 text-lg font-bold text-navy disabled:opacity-60">{translate(pending ? 'Enviando…' : 'Enviar inscripción al campus')}</button>
    </form>
}
