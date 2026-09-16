'use client'

import { useState } from 'react'
import { collectExistingReceipt, getReceiptsToCollect } from '@/app/actions/finance'
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
    const receipt = receipts.find(p => p.id === selected)
    async function show() {
        setOpen(true); setLoading(true); setSearch(''); setSelected(paymentId || ''); setReceipts([])
        try { setReceipts(await getReceiptsToCollect()) }
        catch { toast.error('No se pudieron cargar los recibos'); setOpen(false) }
        finally { setLoading(false) }
    }
    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!receipt || busy) return
        const data = new FormData(event.currentTarget)
        setBusy(true)
        try {
            const result = await collectExistingReceipt({ id: receipt.id, version: receipt.updated_at, date: String(data.get('date')), method: String(data.get('method')) })
            if (!result.success) { toast.error(result.error); return }
            toast.success('Cobro registrado en el recibo existente, sin crear otro ingreso')
            setOpen(false); await onSaved()
        } catch { toast.error('No se pudo confirmar. Revisa el estado antes de volver a intentarlo.') }
        finally { setBusy(false) }
    }
    return <>
        <Button size="sm" onClick={show}>{paymentId ? 'Cobrar' : 'Registrar cobro'}</Button>
        <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value) }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogTitle>Registrar cobro de un recibo</DialogTitle>
                <DialogDescription>Selecciona la deuda que se ha pagado. No se creará otro recibo ni se cambiará su vencimiento.</DialogDescription>
                {loading ? <p>Cargando…</p> : <form onSubmit={save} className="space-y-4">
                    <fieldset disabled={busy} className="space-y-4">
                        <label className="block text-sm">Buscar jugador o concepto<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre del jugador o mensualidad" /></label>
                        <label className="block text-sm">Recibo pendiente<select required value={selected} onChange={e => setSelected(e.target.value)} className="mt-1 w-full rounded border p-2">
                            <option value="">Selecciona un recibo</option>
                            {receipts.filter(p => p.id === selected || `${p.childName} ${p.description} ${p.due_date}`.toLowerCase().includes(search.toLowerCase())).map(p => <option key={p.id} value={p.id}>{p.childName} · {p.description || p.type} · {p.due_date || 'Sin vencimiento'} · {p.amount} €</option>)}
                        </select></label>
                        {!receipts.length && <p className="text-sm">No hay recibos pendientes disponibles. No registres una mensualidad como ingreso extra: revisa antes la inscripción y sus recibos.</p>}
                        {receipt && <div className="rounded bg-slate-100 p-3 text-sm"><strong>{receipt.childName}</strong><p>{receipt.description}</p><p>Vencimiento: {receipt.due_date || 'Sin fecha'} · Total a cobrar: <strong>{receipt.amount} €</strong></p><p>Este formulario registra el pago completo, no un pago parcial.</p></div>}
                        <label className="block text-sm">Fecha real de recepción<Input name="date" type="date" required defaultValue={new Date().toLocaleDateString('en-CA')} /></label>
                        <label className="block text-sm">Método utilizado<select name="method" required className="mt-1 w-full rounded border p-2"><option value="transfer">Transferencia</option><option value="cash">Efectivo</option></select></label>
                        <label className="flex gap-2 text-sm"><input type="checkbox" required />Confirmo que hemos recibido el importe completo de este recibo.</label>
                        <Button type="submit" disabled={!receipt || busy} className="w-full">{busy ? 'Guardando…' : 'Confirmar cobro'}</Button>
                    </fieldset>
                </form>}
            </DialogContent>
        </Dialog>
    </>
}
