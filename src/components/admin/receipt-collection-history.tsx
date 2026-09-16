'use client'
import { useState } from 'react'
import { getCollectionHistory, voidManualBatch } from '@/app/actions/finance'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

export function ReceiptCollectionHistory({ paymentId, onSaved }: { paymentId: string; onSaved: () => Promise<void> }) {
    const [open, setOpen] = useState(false)
    const [details, setDetails] = useState<Awaited<ReturnType<typeof getCollectionHistory>> | null>(null)
    const [busy, setBusy] = useState(false)
    async function load() {
        setOpen(true); setDetails(null)
        try { setDetails(await getCollectionHistory(paymentId)) }
        catch { toast.error('No se pudo cargar el historial'); setOpen(false) }
    }
    async function cancel(id: string, total: number) {
        const reason = window.prompt(`Anulará el cobro completo de ${total} €, incluido su reparto entre todos los recibos. No devuelve dinero. Los importes volverán a quedar pendientes. Indica el motivo:`)
        if (!reason || busy) return
        setBusy(true)
        try {
            const result = await voidManualBatch(id, reason)
            if (!result.success) { toast.error(result.error); return }
            toast.success('Cobro anulado con historial. Saldos recalculados.')
            await onSaved(); await load()
        } catch { toast.error('No se pudo anular; revisa el historial antes de repetir') }
        finally { setBusy(false) }
    }
    return <>
        <Button size="sm" variant="outline" className="ml-2" onClick={load}>Abonos / historial</Button>
        <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value) }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogTitle>Abonos del recibo</DialogTitle><DialogDescription>Cada abono forma parte de un cobro. Anularlo revierte todo su reparto, conserva el historial y no devuelve dinero.</DialogDescription>
            {!details ? <p>Cargando…</p> : !details.entries.length ? <p>Sin abonos registrados.</p> : details.entries.map(entry => {
                const batch = entry.batch as unknown as { total: number; note: string; void_reason: string | null }
                return <div key={entry.id} className="rounded border p-3 text-sm space-y-1"><p className="font-semibold">{Number(entry.amount).toFixed(2)} € · {entry.voided_at ? 'Anulado' : 'Abonado'}</p><p>{entry.paid_date} · {entry.method === 'cash' ? 'Efectivo' : 'Transferencia'}</p><p>Cobro {entry.batch_id.slice(0, 8)} · Total recibido: {Number(batch.total).toFixed(2)} €</p>{batch.note && <p>{batch.note}</p>}{entry.voided_at && <p>Motivo: {batch.void_reason}</p>}{details.canVoid && !entry.voided_at && <Button variant="destructive" size="sm" disabled={busy} onClick={() => cancel(entry.batch_id, Number(batch.total))}>Anular cobro completo</Button>}</div>
            })}
        </DialogContent></Dialog>
    </>
}
