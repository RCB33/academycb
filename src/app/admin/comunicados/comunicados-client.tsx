'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { BellRing, Mail, MessageSquare, Check, Loader2, Send } from 'lucide-react'
import { getRecipientsAllGuardians, getRecipientsByCategory, getRecipientsByTeam, publishPortalAnnouncement, sendEmailToGuardians, sendToRecipients, type Recipient } from '@/app/actions/whatsapp'
import { deliverChannels, normalizedPhone, type Channel, type DeliveryResult } from '@/lib/communication-delivery'
import { renderCommunicationEmail } from '@/lib/communication-email'

const channels = [{ id: 'portal' as const, label: 'App · Familias', icon: BellRing }, { id: 'email' as const, label: 'Email', icon: Mail }, { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare }]
type HistoryItem = { id: string; channel: string; category_name: string; message: string; created_at: string; sent_count: number; failed_count: number }
interface Props { userId: string; categories: { id: string; name: string }[]; teams: { id: string; name: string; category_name: string }[]; history: HistoryItem[] }
const emailIsValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export function ComunicadosClient({ userId, categories, teams, history }: Props) {
    const router = useRouter()
    const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['portal'])
    const [scope, setScope] = useState<'all' | 'category' | 'team'>('category')
    const [selectedId, setSelectedId] = useState('')
    const [recipients, setRecipients] = useState<Recipient[]>([])
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [confirm, setConfirm] = useState(false)
    const [sending, setSending] = useState(false)
    const [progress, setProgress] = useState('')
    const [results, setResults] = useState<DeliveryResult[] | null>(null)
    const sendingRef = useRef(false)
    const locked = sending || results !== null
    const [preview, setPreview] = useState(false)
    const [draftReady, setDraftReady] = useState(false)
    const [draftStatus, setDraftStatus] = useState('')
    const draftKey = `academy-comunicado-v1:${userId}`

    useEffect(() => {
        try {
            const raw = localStorage.getItem(draftKey)
            if (raw) {
                const draft = JSON.parse(raw)
                if (typeof draft.savedAt === 'number' && Date.now() - draft.savedAt < 7 * 86400000 && typeof draft.subject === 'string' && typeof draft.message === 'string') {
                    setSubject(draft.subject.slice(0, 150)); setMessage(draft.message.slice(0, 5000))
                    if (Array.isArray(draft.channels)) setSelectedChannels(channels.filter(c => draft.channels.includes(c.id)).map(c => c.id))
                    setDraftStatus('Borrador recuperado. Revisa los destinatarios antes de enviar.')
                } else localStorage.removeItem(draftKey)
            }
        } catch { setDraftStatus('El navegador no permite guardar el borrador.') }
        setDraftReady(true)
    }, [draftKey])

    useEffect(() => {
        if (!draftReady || locked) return
        try {
            if (subject || message) {
                localStorage.setItem(draftKey, JSON.stringify({ subject, message, channels: selectedChannels, savedAt: Date.now() }))
                setDraftStatus('Borrador guardado en este navegador durante 7 días. Vuelve a elegir los destinatarios al recuperarlo.')
            } else { localStorage.removeItem(draftKey); setDraftStatus('') }
        } catch { setDraftStatus('No se pudo guardar el borrador. No cierres esta página.') }
    }, [draftKey, draftReady, subject, message, selectedChannels, locked])

    useEffect(() => {
        let cancelled = false
        setRecipients([]); setSelected(new Set()); setError('')
        if (scope !== 'all' && !selectedId) { setLoading(false); return }
        setLoading(true)
        const request = scope === 'all' ? getRecipientsAllGuardians() : scope === 'category' ? getRecipientsByCategory(selectedId) : getRecipientsByTeam(selectedId)
        request.then(rows => { if (!cancelled) { setRecipients(rows); setSelected(new Set(rows.map(r => r.id))) } })
            .catch(() => { if (!cancelled) setError('No se pudieron cargar los tutores. Vuelve a seleccionar el grupo.') })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [scope, selectedId])

    const rows = recipients.filter(r => selected.has(r.id))
    const unavailable = {
        portal: rows.filter(r => !r.userIds.length),
        email: rows.filter(r => !emailIsValid(r.email.trim())),
        whatsapp: rows.filter(r => normalizedPhone(r.phone).length < 9),
    }
    const destinations = {
        portal: [...new Set(rows.flatMap(r => r.userIds))],
        email: [...new Set(rows.map(r => r.email.trim().toLowerCase()).filter(emailIsValid))],
        whatsapp: [...new Set(rows.map(r => normalizedPhone(r.phone)).filter(p => p.length >= 9))],
    }
    const scopeLabel = scope === 'all' ? 'Todos los tutores' : (scope === 'category' ? categories : teams).find(r => r.id === selectedId)?.name || ''
    const label = scope === 'all' ? 'Todos' : scopeLabel
    const fullMessage = `${subject.trim()}\n\n${message.trim()}`
    const maxMessage = selectedChannels.some(c => c !== 'email') ? Math.max(0, 2000 - subject.trim().length - 2) : 5000
    const valid = !loading && !locked && rows.length > 0 && selectedChannels.length > 0 && subject.trim().length >= 3 && message.trim().length >= 2 && message.trim().length <= maxMessage && selectedChannels.some(c => destinations[c].length > 0) && (!selectedChannels.includes('email') || rows.flatMap(r => r.guardianIds).length <= 500)

    async function send() {
        if (!valid || sendingRef.current) return
        sendingRef.current = true; setSending(true)
        try { localStorage.removeItem(draftKey) } catch { /* Sending must not depend on browser storage. */ }
        const outcome = await deliverChannels(selectedChannels, async channel => {
            setProgress(`Enviando por ${channels.find(c => c.id === channel)?.label}…`)
            if (!destinations[channel].length) return null
            if (channel === 'portal') return publishPortalAnnouncement(destinations.portal, fullMessage, label, scope)
            if (channel === 'email') return sendEmailToGuardians([...new Set(rows.filter(r => emailIsValid(r.email)).flatMap(r => r.guardianIds))], subject, message, label, scope)
            let sent = 0, failed = 0
            for (let i = 0; i < destinations.whatsapp.length; i += 25) {
                const result = await sendToRecipients(destinations.whatsapp.slice(i, i + 25), fullMessage, label)
                sent += result.summary?.success || 0; failed += result.summary?.failed || 0
                if (!result.success) return { success: false, error: result.error, summary: { success: sent, failed } }
            }
            return { success: true, summary: { success: sent, failed } }
        })
        setResults(outcome); setSending(false); sendingRef.current = false; setConfirm(false); setProgress(''); router.refresh()
    }

    return <div className="space-y-5">
        {draftStatus && !locked && <p role="status" className="rounded-xl bg-navy/5 px-4 py-3 text-xs text-slate-600">{draftStatus}</p>}
        <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>Vista previa del email</DialogTitle><DialogDescription>Diseño Academy. Algunos gestores de correo pueden mostrar pequeñas diferencias.</DialogDescription></DialogHeader><iframe title="Vista previa del comunicado" sandbox="" srcDoc={renderCommunicationEmail(subject || 'Asunto del comunicado', message || 'Aquí aparecerá tu mensaje para las familias.')} className="h-[60dvh] w-full rounded-xl border bg-slate-50" /><Button variant="outline" onClick={() => setPreview(false)}>Cerrar vista previa</Button></DialogContent></Dialog>
        {selectedChannels.some(c => unavailable[c].length > 0) && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><h2 className="font-semibold text-navy">Algunos tutores no recibirán este canal</h2><p className="mt-1 text-xs text-slate-600">Sí recibirán los otros canales seleccionados para los que tengan datos disponibles.</p>{selectedChannels.filter(c => unavailable[c].length > 0).map(c => <details key={c} className="mt-3 text-sm"><summary className="cursor-pointer font-medium">{channels.find(v => v.id === c)?.label}: {unavailable[c].length} sin {c === 'portal' ? 'cuenta vinculada' : c === 'email' ? 'email válido' : 'teléfono válido'}</summary><ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-slate-600">{unavailable[c].map(r => <li key={r.id}>{r.guardianName}</li>)}</ul></details>)}</section>}
        <fieldset disabled={locked} className="min-w-0 space-y-5">
            <section className="rounded-2xl border bg-white p-5 sm:p-6">
                <h2 className="font-heading text-xl font-bold text-navy">1. Elige dónde enviarlo</h2>
                <p className="mt-1 text-sm text-slate-500">Selecciona uno, dos o los tres canales.</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{channels.map(c => <label key={c.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-semibold ${selectedChannels.includes(c.id) ? 'border-gold bg-gold/10 text-navy' : 'border-slate-200 text-slate-500'}`}>
                    <input type="checkbox" checked={selectedChannels.includes(c.id)} onChange={() => setSelectedChannels(current => current.includes(c.id) ? current.filter(v => v !== c.id) : [...current, c.id])} className="h-5 w-5 accent-gold" /><c.icon className="h-5 w-5" />{c.label}
                </label>)}</div>
            </section>
            <div className="grid gap-5 lg:grid-cols-2">
                <section className="min-w-0 rounded-2xl border bg-white p-5 sm:p-6">
                    <h2 className="font-heading text-xl font-bold text-navy">2. Destinatarios</h2>
                    <div className="mt-4 grid grid-cols-3 gap-2">{(['category', 'team', 'all'] as const).map(s => <button key={s} type="button" aria-pressed={scope === s} onClick={() => { setScope(s); setSelectedId('') }} className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${scope === s ? 'border-gold bg-gold text-navy' : 'text-slate-500'}`}>{s === 'category' ? 'Categoría' : s === 'team' ? 'Equipo' : 'Todos'}</button>)}</div>
                    {scope !== 'all' && <select aria-label={scope === 'category' ? 'Categoría' : 'Equipo'} value={selectedId} onChange={e => setSelectedId(e.target.value)} className="mt-3 min-h-12 w-full rounded-xl border bg-white px-3 text-base"><option value="">Selecciona {scope === 'category' ? 'una categoría' : 'un equipo'}</option>{(scope === 'category' ? categories : teams).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}
                    {loading ? <p className="py-8 text-center text-sm text-slate-500">Cargando tutores…</p> : <>
                        {recipients.length > 0 && <><Input aria-label="Buscar tutor o jugador" placeholder="Buscar tutor o jugador" value={search} onChange={e => setSearch(e.target.value)} className="mt-4 h-11 text-base" /><div className="my-2 flex items-center justify-between text-sm"><span>{rows.length} tutores seleccionados</span><button type="button" className="min-h-11 px-2 font-semibold text-navy" onClick={() => setSelected(selected.size === recipients.length ? new Set() : new Set(recipients.map(r => r.id)))}>{selected.size === recipients.length ? 'Quitar todos' : 'Seleccionar todos'}</button></div></>}
                        <div className="max-h-72 space-y-2 overflow-y-auto">{recipients.filter(r => `${r.guardianName} ${r.childName} ${r.email}`.toLowerCase().includes(search.toLowerCase())).map(r => <label key={r.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected.has(r.id) ? 'border-gold/40 bg-gold/5' : 'border-slate-200'}`}><input type="checkbox" aria-label={`Seleccionar ${r.guardianName}`} checked={selected.has(r.id)} onChange={() => setSelected(current => { const next = new Set(current); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); return next })} className="mt-1 h-5 w-5 shrink-0 accent-gold" /><span className="min-w-0"><span className="block font-semibold text-navy">{r.guardianName}</span><span className="block break-words text-xs text-slate-500">{r.childName}</span><span className="mt-1 block text-xs text-slate-500">{[r.userIds.length ? 'App' : '', emailIsValid(r.email) ? 'Email' : '', r.phone.length >= 9 ? 'WhatsApp' : ''].filter(Boolean).join(' · ') || 'Sin canal disponible'}</span></span></label>)}</div>
                        {!recipients.length && <p className="py-6 text-sm text-slate-500">{selectedId || scope === 'all' ? 'No hay tutores disponibles en esta selección.' : 'Elige un grupo para ver sus tutores.'}</p>}
                    </>}
                    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
                </section>
                <section className="min-w-0 rounded-2xl border bg-white p-5 sm:p-6">
                    <h2 className="font-heading text-xl font-bold text-navy">3. Escribe el comunicado</h2>
                    {selectedChannels.includes('email') && <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => setPreview(true)}><Mail className="mr-2 h-4 w-4" />Vista previa del email</Button>}
                    <label htmlFor="broadcast-subject" className="mt-4 block text-sm font-semibold text-navy">Asunto / título</label>
                    <Input id="broadcast-subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={150} placeholder="Por ejemplo: horario del próximo entrenamiento" className="mt-2 min-h-12 text-base" />
                    <label htmlFor="broadcast-message" className="mt-4 block text-sm font-semibold text-navy">Mensaje</label>
                    <Textarea id="broadcast-message" value={message} onChange={e => setMessage(e.target.value)} rows={7} placeholder="Escribe aquí la información para las familias…" className="mt-2 min-h-44 text-base" />
                    <p className={`mt-2 text-right text-xs ${message.trim().length > maxMessage ? 'text-red-700' : 'text-slate-500'}`}>{message.trim().length} / {maxMessage} caracteres</p>
                    {selectedChannels.includes('email') && <div className="mt-4 rounded-xl bg-navy/5 p-4 text-sm text-slate-600"><p className="font-semibold text-navy">Diseño Academy incluido</p><p className="mt-1">El email incorpora automáticamente el logo, la cabecera azul y dorada y el pie de Academy. Cada familia recibe su correo de forma privada.</p></div>}
                </section>
            </div>
        </fieldset>
        {results ? <section className="rounded-2xl border bg-white p-5" aria-live="polite"><h2 className="text-lg font-bold text-navy">Resultado por canal</h2><div className="mt-3 space-y-3">{results.map(r => <div key={r.channel} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">{channels.find(c => c.id === r.channel)?.label}: {r.status === 'sent' ? `${r.sent} envíos realizados` : r.status === 'partial' ? `Envío parcial: ${r.sent} realizados, ${r.failed} con error` : r.status === 'skipped' ? 'Sin destinatarios' : 'No completado'}</p>{r.detail && <p className="mt-1 text-slate-600">{r.detail}</p>}</div>)}</div><p className="mt-4 text-sm text-slate-500">Revisa los resultados antes de repetir un envío. Los canales completados ya han enviado el mensaje.</p><Button className="mt-4 bg-navy text-white" onClick={() => { setResults(null); setSubject(''); setMessage('') }}>Nuevo comunicado</Button></section> : <section className="rounded-2xl border bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-navy">Alcance del envío</p><p className="mt-1 text-sm text-slate-500">{selectedChannels.map(c => `${channels.find(v => v.id === c)?.label}: ${destinations[c].length}`).join(' · ') || 'Elige al menos un canal'}</p><p className="mt-1 text-xs text-slate-500">Cada canal usa solo los contactos disponibles, sin repetir email, teléfono o cuenta.</p></div><Button disabled={!valid} onClick={() => setConfirm(true)} className="min-h-12 bg-gold font-bold text-navy hover:bg-gold/90"><Send className="mr-2 h-4 w-4" />Revisar y enviar</Button></div></section>}
        <Dialog open={confirm} onOpenChange={open => { if (!sending) setConfirm(open) }}><DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>Confirmar comunicado</DialogTitle><DialogDescription>{scopeLabel}. Comprueba los canales y el mensaje antes de enviar.</DialogDescription></DialogHeader><p className="font-bold text-navy">{subject}</p><p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-600">{message}</p><div className="space-y-2">{selectedChannels.map(c => <p key={c} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-gold" />{channels.find(v => v.id === c)?.label}: {destinations[c].length} destinatarios{!destinations[c].length ? ' (se omitirá)' : ''}</p>)}</div><p className="text-xs text-slate-500">Los envíos se procesan por canal. Mantén esta ventana abierta hasta ver el resultado.</p><DialogFooter><Button variant="outline" disabled={sending} onClick={() => setConfirm(false)}>Volver</Button><Button disabled={sending || !valid} onClick={() => void send()} className="min-h-12 bg-gold text-navy">{sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{progress}</> : 'Enviar ahora'}</Button></DialogFooter></DialogContent></Dialog>
        <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-bold text-navy">Historial de envíos ({history.length})</summary><div className="mt-4 divide-y">{history.map(log => <article key={log.id} className="py-3 text-sm"><div className="flex flex-wrap gap-2 font-semibold text-navy"><span>{channels.find(c => c.id === log.channel)?.label || log.channel}</span><span>· {log.category_name}</span></div><p className="mt-1 line-clamp-2 whitespace-pre-wrap text-slate-600">{log.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString('es-ES')} · {log.sent_count} enviados{log.failed_count ? ` · ${log.failed_count} con error` : ''}</p></article>)}{!history.length && <p className="text-sm text-slate-500">Todavía no hay envíos.</p>}</div></details>
    </div>
}
