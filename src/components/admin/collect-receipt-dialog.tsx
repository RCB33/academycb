'use client'

import { useState } from 'react'
import { collectManualBatch, getReceiptsToCollect } from '@/app/actions/finance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

export function CollectReceiptDialog({ paymentId, onSaved }: { paymentId?: string; onSaved: () => Promise<void> }) {
    const [open, setOpen] = useState(false)
    const [receipts, setReceipts] = useState<Awaited<ReturnType<typeof getReceiptsToCollect>>>([])
    const [selected, setSelected] = useState('')
    const [search, setSearch] = useState('')
    const [busy, setBusy] = useState(false)
    const [loading, setLoading] = useState(false)
    const [lines, setLines] = useState<Record<string, string>>({})
    const [total, setTotal] = useState('')
    const [requestId, setRequestId] = useState('')
    const sumCents = Object.values(lines).reduce((sum, value) => sum + Math.round(Number(value || 0) * 100), 0)
    async function show() {
        setOpen(true); setLoading(true); setSearch(''); setSelected(''); setReceipts([]); setLines({}); setTotal(''); setRequestId(crypto.randomUUID())
        try {
            const rows = await getReceiptsToCollect(); setReceipts(rows)
            const initial = rows.find(p => p.id === paymentId)
            if (initial) { setLines({ [initial.id]: String(initial.remaining) }); setTotal(String(initial.remaining)) }
        }
        catch { toast.error('No se pudieron cargar los recibos'); setOpen(false) }
        finally { setLoading(false) }
    }
    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!Object.keys(lines).length || busy) return
        const data = new FormData(event.currentTarget)
        setBusy(true)
        try {
            const result = await collectManualBatch({ requestId, lines: Object.entries(lines).map(([id, amount]) => ({ id, amount: Number(amount), version: receipts.find(p => p.id === id)!.updated_at })), total: Number(total), date: String(data.get('date')), method: String(data.get('method')), note: String(data.get('note') || '') })
            if (!result.success) { toast.error(result.error); return }
            toast.success('Abonos guardados y saldos actualizados')
            setOpen(false); await onSaved()
        } catch { toast.error('No se pudo confirmar. Revisa el estado antes de volver a intentarlo.') }
        finally { setBusy(false) }
    }
    return <>
        <Button size="sm" onClick={show}>{paymentId ? 'Cobrar' : 'Registrar cobro'}</Button>
        <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value) }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogTitle>Registrar cobro y repartir</DialogTitle>
                <DialogDescription>Puedes abonar parte de una cuota o repartir una transferencia entre recibos de hermanos con un tutor en común. El importe original no cambia.</DialogDescription>
                {loading ? <p>Cargando…</p> : <form onSubmit={save} className="space-y-4">
                    <fieldset disabled={busy} className="space-y-4">
                        <label className="block text-sm">Buscar jugador o concepto<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre del jugador o mensualidad" /></label>
                        <label className="block text-sm">Añadir recibo pendiente<select value={selected} onChange={e => { const p = receipts.find(r => r.id === e.target.value); if (p) { setLines(old => ({ ...old, [p.id]: String(p.remaining) })); setSelected('') } }} className="mt-1 w-full rounded border p-2">
                            <option value="">Selecciona un recibo</option>
                            {receipts.filter(p => !(p.id in lines) && `${p.childName} ${p.description} ${p.due_date}`.toLowerCase().includes(search.toLowerCase())).map(p => <option key={p.id} value={p.id}>{p.childName} · {p.description || p.type} · {p.due_date || 'Sin vencimiento'} · Pendiente {p.remaining} €</option>)}
                        </select></label>
                        {!receipts.length && <p className="text-sm">No hay recibos pendientes disponibles. No registres una mensualidad como ingreso extra: revisa antes la inscripción y sus recibos.</p>}
                        {Object.entries(lines).map(([id, value]) => {
                            const p = receipts.find(r => r.id === id)!
                            const after = Math.max(0, Math.round(p.remaining * 100) - Math.round(Number(value || 0) * 100)) / 100
                            return <div key={id} className="rounded border p-3 text-sm space-y-2"><strong>{p.childName}</strong><p>{p.description} · Vence {p.due_date || 'sin fecha'}</p><p>Total: {p.amount} € · Abonado: {p.paid} € · Pendiente: {p.remaining} €</p><label className="block">Aplicar ahora (€)<Input type="number" required min="0.01" max={p.remaining} step="0.01" value={value} onChange={e => setLines(old => ({ ...old, [id]: e.target.value }))} /></label><p>Quedará pendiente: <strong>{after.toFixed(2)} €</strong></p><Button type="button" variant="ghost" size="sm" onClick={() => setLines(old => { const next = { ...old }; delete next[id]; return next })}>Quitar del reparto</Button></div>
                        })}
                        <label className="block text-sm">Importe total recibido (€)<Input type="number" min="0.01" max="1000000" step="0.01" required value={total} onChange={e => setTotal(e.target.value)} /></label>
                        <p className={sumCents === Math.round(Number(total) * 100) ? 'text-green-700 text-sm' : 'text-amber-800 text-sm'}>Repartido: {(sumCents / 100).toFixed(2)} € · Debe coincidir con el importe recibido.</p>
                        <label className="block text-sm">Fecha real de recepción<Input name="date" type="date" required max={new Date().toLocaleDateString('en-CA')} defaultValue={new Date().toLocaleDateString('en-CA')} /></label>
                        <label className="block text-sm">Método utilizado<select name="method" required className="mt-1 w-full rounded border p-2"><option value="transfer">Transferencia</option><option value="cash">Efectivo</option></select></label>
                        <label className="block text-sm">Referencia u observaciones (opcional)<Input name="note" maxLength={500} placeholder="Ej. Transferencia del tutor, septiembre" /></label>
                        <label className="flex gap-2 text-sm"><input type="checkbox" required />Confirmo que hemos recibido este importe y que el reparto es correcto.</label>
                        <Button type="submit" disabled={!Object.keys(lines).length || sumCents !== Math.round(Number(total) * 100) || busy} className="w-full">{busy ? 'Guardando…' : 'Confirmar cobro y reparto'}</Button>
                    </fieldset>
                </form>}
            </DialogContent>
        </Dialog>
    </>
}
