'use client'
import { useState } from 'react'
import { preparePaymentReminder } from '@/app/actions/payment-reminders'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

export function PaymentReminderButton({ id }: { id: string }) {
    const [data, setData] = useState<Awaited<ReturnType<typeof preparePaymentReminder>> | null>(null)
    const [busy, setBusy] = useState(false)
    return <><Button size="sm" variant="outline" disabled={busy} onClick={async () => {
        setBusy(true)
        try { setData(await preparePaymentReminder(id)) }
        catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo preparar') }
        finally { setBusy(false) }
    }}>Preparar recordatorio</Button>
    <Dialog open={Boolean(data)} onOpenChange={open => { if (!open) setData(null) }}><DialogContent className="max-h-[90dvh] overflow-auto"><DialogTitle>Revisar recordatorio</DialogTitle><DialogDescription>El saldo se ha comprobado al abrir. No se envía automáticamente: elige el tutor y confirma el envío en WhatsApp o en tu correo.</DialogDescription><p className="whitespace-pre-wrap text-sm">{data?.message}</p>{data?.guardians.map(g => <div key={g.id} className="rounded border p-3"><p className="font-bold">{g.name}</p><div className="mt-2 flex gap-2">{g.whatsapp && <Button asChild variant="outline"><a href={g.whatsapp} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a></Button>}{g.email && <Button asChild variant="outline"><a href={g.email}>Abrir correo</a></Button>}{!g.whatsapp && !g.email && <p>Sin teléfono ni email válido.</p>}</div></div>)}{data?.guardians.length === 0 && <p>Vincula primero un tutor a este jugador.</p>}</DialogContent></Dialog></>
}
