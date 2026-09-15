'use client'

import { useState } from 'react'
import { correctManualPayment, getManualPaymentDetails } from '@/app/actions/finance'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type Details = Awaited<ReturnType<typeof getManualPaymentDetails>>
const money = (value: unknown) => Number(value || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

export function ManualPaymentEditor({ paymentId, onSaved }: { paymentId: string; onSaved: () => Promise<void> }) {
    const [open, setOpen] = useState(false)
    const [details, setDetails] = useState<Details | null>(null)
    const [busy, setBusy] = useState(false)
    const [action, setAction] = useState<'edit' | 'cancel'>('edit')

    async function load() {
        setOpen(true)
        setDetails(null)
        setAction('edit')
        try { setDetails(await getManualPaymentDetails(paymentId)) }
        catch { toast.error('No se pudo abrir el cobro'); setOpen(false) }
    }

    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!details || busy) return
        const form = new FormData(event.currentTarget)
        setBusy(true)
        try {
            const result = await correctManualPayment({
                id: paymentId, version: details.payment.updated_at, action,
                reason: String(form.get('reason') || ''),
                ...(action === 'edit' ? {
                    amount: Number(form.get('amount')), description: String(form.get('description')),
                    date: String(form.get('date')), method: String(form.get('method')),
                } : {}),
            })
            if (!result.success) { toast.error(result.error); return }
            toast.success(action === 'cancel' ? 'Cobro anulado. Ya no cuenta como ingreso ni deuda pendiente.' : 'Pago corregido e historial guardado')
            setOpen(false)
            await onSaved()
        } catch { toast.error('No se pudo guardar el cambio') }
        finally { setBusy(false) }
    }

    const locked = details && ['cancelled', 'refunded'].includes(details.payment.status)
    return <>
        <Button size="sm" variant="outline" className="ml-2" onClick={load}>Gestionar / historial</Button>
        <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value) }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogTitle>Gestionar pago manual</DialogTitle>
                <DialogDescription>Corrige un error o anula un duplicado. El registro original y los cambios se conservarán.</DialogDescription>
                {!details ? <p>Cargando cobro…</p> : <>
                    <p className="text-sm">{details.payment.description} · <strong>{money(details.payment.amount)}</strong></p>
                    {locked ? <p className="rounded bg-slate-100 p-3 text-sm">Este cobro está anulado o reembolsado y no se puede modificar.</p> : <form onSubmit={save} className="space-y-4">
                        <fieldset disabled={busy} className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant={action === 'edit' ? 'default' : 'outline'} onClick={() => setAction('edit')}>Editar pago</Button>
                                <Button type="button" variant={action === 'cancel' ? 'destructive' : 'outline'} onClick={() => setAction('cancel')}>Anular duplicado</Button>
                            </div>
                            {action === 'edit' ? <>
                                <label className="block text-sm">Concepto<Input name="description" required minLength={3} maxLength={240} defaultValue={details.payment.description || ''} /></label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <label className="block text-sm">Importe (€)<Input name="amount" type="number" min="0.01" max="1000000" step="0.01" required defaultValue={details.payment.amount} /></label>
                                    <label className="block text-sm">Fecha<Input name="date" type="date" required defaultValue={(details.payment.paid_at || details.payment.due_date || '').slice(0, 10)} /></label>
                                </div>
                                <label className="block text-sm">Método<select name="method" className="mt-1 h-10 w-full rounded-md border px-3" defaultValue={['cash', 'efectivo'].includes(details.payment.method) ? 'cash' : 'transfer'}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option></select></label>
                            </> : <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-950">
                                No se borrará el registro ni se devolverá dinero. Dejará de contar como ingreso y como deuda pendiente.
                                <label className="mt-3 flex items-start gap-2"><input type="checkbox" required className="mt-1" />Confirmo que este registro es un duplicado o un ingreso introducido por error.</label>
                            </div>}
                            <label className="block text-sm">Motivo del cambio<textarea name="reason" required minLength={5} maxLength={500} className="mt-1 min-h-20 w-full rounded-md border p-2" placeholder="Ej. Ingreso duplicado al registrar la transferencia" /></label>
                            <Button type="submit" disabled={busy} variant={action === 'cancel' ? 'destructive' : 'default'} className="w-full">{busy ? 'Guardando…' : action === 'cancel' ? 'Confirmar anulación' : 'Guardar corrección'}</Button>
                        </fieldset>
                    </form>}
                    <section className="space-y-3 border-t pt-4">
                        <h3 className="font-semibold">Historial de cambios</h3>
                        {!details.history.length && <p className="text-sm text-slate-500">Sin correcciones registradas desde la activación del historial.</p>}
                        {details.history.map((entry) => {
                            const before = entry.before_value as Record<string, unknown>
                            const after = entry.after_value as Record<string, unknown>
                            return <div key={entry.id} className="rounded-md border p-3 text-sm">
                                <p className="font-medium">{entry.reason}</p>
                                <p className="text-xs text-slate-500">{new Date(entry.changed_at).toLocaleString('es-ES')} · Usuario {entry.actor_id?.slice(0, 8) || 'Sistema'}</p>
                                <p>{money(before.amount)} → {money(after.amount)} · {String(before.status)} → {String(after.status)}</p>
                                {['description', 'method', 'due_date'].filter(key => before[key] !== after[key]).map(key => <p key={key} className="break-words">{String(before[key] || '—')} → {String(after[key] || '—')}</p>)}
                            </div>
                        })}
                    </section>
                </>}
            </DialogContent>
        </Dialog>
    </>
}
