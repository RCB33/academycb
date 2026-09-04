'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    getRecipientsAllGuardians, getRecipientsByCategory, getRecipientsByTeam, publishPortalAnnouncement, sendEmailToGuardians, sendToRecipients,
    type Recipient
} from '@/app/actions/whatsapp'
import { toast } from 'sonner'
import {
    Loader2, Send, MessageSquare, Clock, CheckCircle, XCircle,
    Users, Phone, Search, Check, X, AlertTriangle, Mail, Timer, Megaphone, ShieldCheck, BellRing
} from 'lucide-react'

interface Props {
    categories: { id: string, name: string }[]
    teams: { id: string, name: string, category_id: string, category_name: string }[]
    history: any[]
}

export function ComunicadosClient({ categories, teams, history }: Props) {
    const [channel, setChannel] = useState<'whatsapp' | 'email' | 'portal'>('whatsapp')
    const [scope, setScope] = useState<'all' | 'category' | 'team'>('category')
    const [selectedId, setSelectedId] = useState('')
    const [recipients, setRecipients] = useState<Recipient[]>([])
    const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())
    const [loadingRecipients, setLoadingRecipients] = useState(false)
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [sendingProgress, setSendingProgress] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const getRecipientKey = (recipient: Recipient) => channel === 'portal'
        ? recipient.userIds.join('|')
        : channel === 'email'
            ? recipient.email.toLowerCase()
            : recipient.phone
    const eligibleRecipients = recipients.filter((recipient) => channel === 'portal'
        ? recipient.userIds.length > 0
        : channel === 'email'
            ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)
            : recipient.phone.length >= 9)
    const selectedRecipientRows = eligibleRecipients.filter((recipient) => selectedRecipients.has(getRecipientKey(recipient)))

    // Fetch recipients when selection changes
    useEffect(() => {
        if (!selectedId) { setRecipients([]); setSelectedRecipients(new Set()); return }
        async function fetch() {
            setLoadingRecipients(true)
            const r = scope === 'all'
                ? await getRecipientsAllGuardians()
                : scope === 'category'
                    ? await getRecipientsByCategory(selectedId)
                    : await getRecipientsByTeam(selectedId)
            const eligible = r.filter((recipient) => channel === 'portal'
                ? recipient.userIds.length > 0
                : channel === 'email'
                    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)
                    : recipient.phone.length >= 9)
            setRecipients(r)
            setSelectedRecipients(new Set(eligible.map(getRecipientKey)))
            setLoadingRecipients(false)
        }
        fetch()
    }, [selectedId, scope, channel])

    const toggleRecipient = (recipient: Recipient) => {
        const key = getRecipientKey(recipient)
        const next = new Set(selectedRecipients)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        setSelectedRecipients(next)
    }

    const selectAll = () => setSelectedRecipients(new Set(eligibleRecipients.map(getRecipientKey)))
    const deselectAll = () => setSelectedRecipients(new Set())

    const filtered = recipients.filter(r =>
        !search || r.childName.toLowerCase().includes(search.toLowerCase()) ||
        r.guardianName.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.includes(search)
    )

    const handleSend = () => {
        if (selectedRecipientRows.length === 0) { toast.error("Selecciona al menos un destinatario."); return }
        if (channel === 'email' && subject.trim().length < 3) { toast.error("Escribe un asunto para el correo."); return }
        if (!message.trim()) { toast.error("Escribe un mensaje."); return }

        setIsConfirmOpen(true)
    }

    const handleConfirmedSend = async () => {
        if (selectedRecipientRows.length === 0 || !message.trim()) return

        setIsSending(true)
        setSendingProgress(null)
        try {
            const label = scope === 'all'
                ? 'Todos'
                : scope === 'category'
                    ? categories.find(c => c.id === selectedId)?.name || 'Categoría'
                    : teams.find(t => t.id === selectedId)?.name || 'Equipo'
            if (channel === 'portal') {
                setSendingProgress('Publicando en Portal Familias…')
                const userIds = Array.from(new Set(selectedRecipientRows.flatMap((recipient) => recipient.userIds)))
                const result = await publishPortalAnnouncement(userIds, message, label, scope)
                if (!result.success) throw new Error(result.error || 'No se ha podido publicar el comunicado.')
                toast.success(`Comunicado publicado para ${result.summary?.published || userIds.length} tutor${userIds.length === 1 ? '' : 'es'}.`)
            } else if (channel === 'email') {
                setSendingProgress('Enviando correos con Resend…')
                const guardianIds = Array.from(new Set(selectedRecipientRows.flatMap((recipient) => recipient.guardianIds)))
                const result = await sendEmailToGuardians(guardianIds, subject, message, label, scope)
                if (!result.success) throw new Error(result.error || 'No se ha podido completar el envío por email.')
                toast.success(`Correo enviado a ${result.summary?.success || guardianIds.length} tutor${guardianIds.length === 1 ? '' : 'es'}.`)
            } else {
                const phones = selectedRecipientRows.map((recipient) => recipient.phone)
                const batches = Array.from({ length: Math.ceil(phones.length / 25) }, (_, index) => phones.slice(index * 25, index * 25 + 25))
                let successCount = 0
                let failedCount = 0

                for (let index = 0; index < batches.length; index++) {
                    setSendingProgress(batches.length > 1 ? `Enviando bloque ${index + 1} de ${batches.length}…` : 'Enviando comunicado…')
                    const result = await sendToRecipients(batches[index], message, label)
                    if (!result.success) throw new Error(result.error || 'No se ha podido completar el envío.')
                    successCount += result.summary?.success || 0
                    failedCount += result.summary?.failed || 0
                }

                toast.success(`Comunicado enviado: ${successCount} entregados${failedCount ? `, ${failedCount} con error` : ''}.`)
            }
            if (channel === 'email') setSubject('')
            setMessage('')
            setIsConfirmOpen(false)
        } catch (e: any) {
            toast.error(e.message || "Error inesperado.")
            console.error(e)
        } finally {
            setIsSending(false)
            setSendingProgress(null)
        }
    }

    const scopeLabel = scope === 'all'
        ? 'Todos los tutores'
        : scope === 'category'
            ? categories.find((category) => category.id === selectedId)?.name || 'Categoría'
            : teams.find((team) => team.id === selectedId)?.name || 'Equipo'
    const estimatedSeconds = Math.max(1, Math.ceil(Math.max(0, selectedRecipientRows.length - 1) * 0.75))
    const estimatedTime = estimatedSeconds < 60 ? `unos ${estimatedSeconds} segundos` : `unos ${Math.ceil(estimatedSeconds / 60)} minutos`

    return (
        <div className="space-y-6">
            {/* Channel Selector */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button onClick={() => setChannel('whatsapp')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all
                        ${channel === 'whatsapp' ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-white border text-slate-500 hover:border-green-300'}`}>
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                </button>
                <button onClick={() => setChannel('email')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all
                        ${channel === 'email' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border text-slate-500 hover:border-blue-300'}`}>
                    <Mail className="h-4 w-4" /> Email (Resend)
                </button>
                <button onClick={() => setChannel('portal')}
                    className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all
                        ${channel === 'portal' ? 'bg-navy text-white shadow-lg shadow-navy/20' : 'bg-white border text-slate-500 hover:border-navy/30'}`}>
                    <BellRing className="h-4 w-4" /> Portal Familias
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* LEFT: Compose */}
                    <div className="lg:col-span-3 space-y-4">
                        <Card className="border-none shadow-lg overflow-hidden">
                            <div className={`h-1.5 ${channel === 'portal' ? 'bg-gold' : channel === 'email' ? 'bg-blue-600' : 'bg-green-600'}`} />
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    {channel === 'portal' ? <BellRing className="h-5 w-5 text-gold" /> : channel === 'email' ? <Mail className="h-5 w-5 text-blue-600" /> : <MessageSquare className="h-5 w-5 text-green-600" />}
                                    {channel === 'portal' ? 'Publicar en Portal Familias' : channel === 'email' ? 'Componer correo' : 'Componer mensaje'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Scope toggle */}
                                <div className="space-y-2">
                                    <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Buscar por</Label>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setScope('category'); setSelectedId(''); setRecipients([]) }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                                ${scope === 'category' ? 'bg-yellow-500 text-black' : 'bg-slate-50 text-slate-500 border'}`}>
                                            📁 Categoría
                                        </button>
                                        <button onClick={() => { setScope('team'); setSelectedId(''); setRecipients([]) }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                                ${scope === 'team' ? 'bg-yellow-500 text-black' : 'bg-slate-50 text-slate-500 border'}`}>
                                            ⚽ Equipo
                                        </button>
                                        <button onClick={() => { setScope('all'); setSelectedId('all'); setRecipients([]) }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                                ${scope === 'all' ? 'bg-navy text-white shadow-lg shadow-navy/20' : 'bg-slate-50 text-slate-500 border'}`}>
                                            <Megaphone className="mr-1 inline h-3.5 w-3.5" /> Todos
                                        </button>
                                    </div>
                                </div>

                                {/* Select dropdown */}
                                {scope === 'all' ? (
                                    <div className="rounded-xl border border-navy/15 bg-navy/[0.03] p-3 text-sm text-navy">
                                        <p className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-gold" /> Comunicado general a todos los tutores</p>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">Cada tutor se incluirá una sola vez, aunque tenga varios jugadores.</p>
                                    </div>
                                ) : <div className="space-y-2">
                                    <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                                        {scope === 'category' ? 'Categoría' : 'Equipo'}
                                    </Label>
                                    <Select value={selectedId} onValueChange={setSelectedId}>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder={`Selecciona ${scope === 'category' ? 'categoría' : 'equipo'}...`} /></SelectTrigger>
                                        <SelectContent>
                                            {scope === 'category'
                                                ? categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                                                : teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-slate-400 text-xs">({t.category_name})</span></SelectItem>)
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>}

                                {channel === 'email' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="email-subject" className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Asunto</Label>
                                        <Input
                                            id="email-subject"
                                            value={subject}
                                            onChange={(event) => setSubject(event.target.value)}
                                            maxLength={150}
                                            placeholder="Ej.: Información importante de Academy"
                                            className="bg-white"
                                        />
                                    </div>
                                )}

                                {/* Message */}
                                <div className="space-y-2">
                                    <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Mensaje</Label>
                                    <Textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="📍 Atención: Se suspende el entrenamiento de hoy por lluvia..."
                                        rows={5}
                                        className="bg-white resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground text-right">{message.length} caracteres</p>
                                </div>

                                {selectedRecipientRows.length > 0 && channel === 'email' && (
                                    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                                        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                                        <div>
                                            <p className="text-xs font-bold text-blue-800">Envío privado con Resend</p>
                                            <p className="mt-0.5 text-[11px] text-blue-700">Cada tutor recibirá un correo individual desde info@academycostabrava.com. Las direcciones nunca se muestran entre familias.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Rate limiting info */}
                                {selectedRecipientRows.length > 0 && channel === 'whatsapp' && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                                        <Timer className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-700">Envío seguro anti-bloqueo</p>
                                            <p className="text-[11px] text-amber-600 mt-0.5">
                                                El envío se realiza de forma escalonada para cuidar la cuenta de WhatsApp.
                                                Tiempo estimado: {estimatedTime} para {selectedRecipientRows.length} destinatario(s).
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t justify-between">
                                <p className="text-xs text-slate-400">
                                    {selectedRecipientRows.length} de {eligibleRecipients.length} seleccionados
                                </p>
                                <Button
                                    onClick={handleSend}
                                    disabled={isSending || selectedRecipientRows.length === 0 || !message.trim() || (channel === 'email' && subject.trim().length < 3)}
                                    className={channel === 'portal' ? 'bg-navy font-bold text-white hover:bg-navy/90' : channel === 'email' ? 'bg-blue-600 font-bold text-white hover:bg-blue-700' : 'bg-green-600 font-bold text-white hover:bg-green-700'}
                                >
                                    {isSending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {sendingProgress || 'Enviando…'}</>
                                    ) : (
                                        <>{channel === 'portal' ? <BellRing className="mr-2 h-4 w-4" /> : channel === 'email' ? <Mail className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}{channel === 'portal' ? ` Publicar (${selectedRecipientRows.length})` : ` Enviar (${selectedRecipientRows.length})`}</>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* RIGHT: Recipients */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="border-none shadow-lg overflow-hidden">
                            <div className="h-1.5 bg-yellow-500" />
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Users className="h-5 w-5 text-yellow-500" />
                                        Destinatarios
                                    </CardTitle>
                                    {eligibleRecipients.length > 0 && (
                                        <div className="flex gap-1">
                                            <button onClick={selectAll} className="text-[10px] font-bold text-green-600 hover:underline">Todos</button>
                                            <span className="text-slate-300">|</span>
                                            <button onClick={deselectAll} className="text-[10px] font-bold text-red-500 hover:underline">Ninguno</button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                {eligibleRecipients.length > 0 && (
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            placeholder={channel === 'portal' ? 'Buscar por tutor o jugador...' : channel === 'email' ? 'Buscar por nombre o email...' : 'Buscar por nombre o teléfono...'}
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="pl-9 h-8 text-xs bg-white"
                                        />
                                    </div>
                                )}

                                {loadingRecipients ? (
                                    <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-yellow-500 mx-auto" /><p className="text-xs text-slate-400 mt-2">Cargando...</p></div>
                                ) : !selectedId ? (
                                    <div className="py-8 text-center text-sm text-slate-400">
                                        ← Selecciona una categoría o equipo
                                    </div>
                                ) : eligibleRecipients.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-slate-400">{channel === 'portal' ? 'No hay tutores con acceso activo al Portal Familias' : channel === 'email' ? 'No se encontraron tutores con email válido' : 'No se encontraron tutores con teléfono'}</div>
                                ) : (
                                    <div className="max-h-[420px] overflow-y-auto space-y-1">
                                        {filtered.filter((recipient) => eligibleRecipients.includes(recipient)).map(r => {
                                            const isSelected = selectedRecipients.has(getRecipientKey(r))
                                            return (
                                                <button key={r.id} onClick={() => toggleRecipient(r)}
                                                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all text-xs
                                                        ${isSelected ? channel === 'email' ? 'border border-blue-200 bg-blue-50' : 'bg-green-50 border border-green-200' : 'bg-white border border-slate-100 opacity-50'}`}>
                                                    <div className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 transition-colors
                                                        ${isSelected ? channel === 'email' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white' : 'bg-slate-100'}`}>
                                                        {isSelected && <Check className="h-3 w-3" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 truncate">{r.childName}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">
                                                            {r.guardianName}
                                                            {r.teamName && <span className="ml-1">· {r.teamName}</span>}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 flex-shrink-0">
                                                        {channel === 'portal' ? <><BellRing className="h-3 w-3 text-gold" /> Portal</> : channel === 'email' ? <><Mail className="h-3 w-3 text-blue-600" /><span className="max-w-28 truncate">{r.email}</span></> : <><Phone className="h-3 w-3" />{r.phone.length > 9 ? `+${r.phone}` : r.phone}</>}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
            </div>

            <Dialog open={isConfirmOpen} onOpenChange={(open) => !isSending && setIsConfirmOpen(open)}>
                <DialogContent className="max-w-md overflow-hidden rounded-3xl border-0 p-0 shadow-2xl">
                    <div className="bg-gradient-to-br from-navy to-navy/90 px-6 pb-5 pt-7 text-white">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-navy">{channel === 'portal' ? <BellRing className="h-6 w-6" /> : channel === 'email' ? <Mail className="h-6 w-6" /> : <Megaphone className="h-6 w-6" />}</div>
                        <DialogHeader>
                            <DialogTitle className="font-heading text-2xl font-black text-white">{channel === 'portal' ? 'Publicar comunicado' : channel === 'email' ? 'Confirmar envío por email' : 'Confirmar comunicado'}</DialogTitle>
                            <DialogDescription className="text-white/70">{channel === 'portal' ? 'Aparecerá en el Portal Familias y avisará a las cuentas con acceso.' : channel === 'email' ? 'Revisa el asunto y los destinatarios antes de enviarlo.' : 'Revisa el alcance antes de iniciar el envío por WhatsApp.'}</DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="space-y-4 px-6 py-5">
                        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">Destinatarios</p>
                            <p className="mt-1 text-lg font-black text-navy">{selectedRecipientRows.length} tutor{selectedRecipientRows.length === 1 ? '' : 'es'}</p>
                            <p className="mt-1 text-sm text-slate-500">{scopeLabel}</p>
                            {channel === 'email' && <p className="mt-3 border-t border-gold/20 pt-3 text-sm font-bold text-navy">{subject}</p>}
                        </div>
                        <div className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                            {channel === 'portal' ? <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-gold" /> : <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${channel === 'email' ? 'text-blue-600' : 'text-green-600'}`} />}
                            <p>{channel === 'portal' ? 'Se publicará de inmediato en el apartado Comunicados y cada tutor con acceso recibirá un aviso en la campana.' : channel === 'email' ? 'Resend entregará un mensaje individual a cada dirección válida, con respuesta a info@academycostabrava.com.' : 'Los mensajes se envían en bloques de hasta 25 contactos y con una pausa corta entre cada uno.'}</p>
                        </div>
                        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <p>{channel === 'portal' ? 'Una vez publicado, seguirá visible para ese grupo en el Portal Familias.' : 'Una vez iniciado, el comunicado no se puede deshacer.'}</p>
                        </div>
                    </div>
                    <DialogFooter className="border-t bg-slate-50 px-6 py-4 sm:justify-between">
                        <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isSending}>Cancelar</Button>
                        <Button type="button" onClick={handleConfirmedSend} disabled={isSending} className={channel === 'portal' ? 'bg-navy font-bold text-white hover:bg-navy/90' : channel === 'email' ? 'bg-blue-600 font-bold text-white hover:bg-blue-700' : 'bg-green-600 font-bold text-white hover:bg-green-700'}>
                            {isSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {sendingProgress || 'Enviando…'}</> : channel === 'portal' ? <><BellRing className="mr-2 h-4 w-4" /> Publicar ahora</> : channel === 'email' ? <><Mail className="mr-2 h-4 w-4" /> Enviar correos</> : <><Send className="mr-2 h-4 w-4" /> Enviar ahora</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* HISTORY */}
            {history.length > 0 && (
                <Card className="border-none shadow-md mt-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-5 w-5 text-slate-400" />
                            Historial de Envíos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {history.map((log: any) => (
                                <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className="bg-yellow-100 text-yellow-700 border-none text-[10px] font-bold">
                                                    {log.category_name}
                                                </Badge>
                                                <Badge className={log.channel === 'portal' ? 'border-none bg-navy/10 text-navy text-[10px] font-bold' : log.channel === 'email' ? 'border-none bg-blue-100 text-blue-700 text-[10px] font-bold' : 'border-none bg-green-100 text-green-700 text-[10px] font-bold'}>
                                                    {log.channel === 'portal' ? 'PORTAL' : log.channel === 'email' ? 'EMAIL' : 'WHATSAPP'}
                                                </Badge>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(log.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 line-clamp-2">{log.message}</p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="flex items-center gap-1 text-xs font-bold text-green-600">
                                                <CheckCircle className="h-3.5 w-3.5" /> {log.sent_count}
                                            </div>
                                            {log.failed_count > 0 && (
                                                <div className="flex items-center gap-1 text-xs font-bold text-red-500">
                                                    <XCircle className="h-3.5 w-3.5" /> {log.failed_count}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
