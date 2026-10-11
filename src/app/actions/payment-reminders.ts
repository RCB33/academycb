'use server'

import { z } from 'zod'
import { requireFinanceAccess } from '@/lib/auth'
import { receiptBalance } from '@/lib/receipt-balance'

export async function preparePaymentReminder(paymentId: string) {
    const { supabase } = await requireFinanceAccess()
    if (!z.string().uuid().safeParse(paymentId).success) throw new Error('Recibo no válido')
    const { data: p, error } = await supabase.from('payments')
        .select('id,child_id,description,type,amount,status,due_date,covered_month,child:children(full_name),manual_receipt_allocations(amount,paid_date,method,voided_at)')
        .eq('id', paymentId).single()
    if (error || !p || !p.child_id) throw new Error('Recibo no disponible o sin jugador vinculado')
    const balance = receiptBalance(p)
    if (!['pending', 'failed'].includes(p.status) || balance.remaining <= 0) throw new Error('Este recibo no tiene saldo pendiente. No se debe enviar un recordatorio.')
    const { data: links, error: linkError } = await supabase.from('child_guardians')
        .select('guardian:guardians(id,full_name,email,phone)').eq('child_id', p.child_id)
    if (linkError) throw new Error('No se pudieron consultar los tutores')
    const child = p.child as unknown as { full_name: string } | null
    const due = p.due_date ? new Date(`${p.due_date}T12:00:00`).toLocaleDateString('es-ES') : 'sin fecha indicada'
    const period = p.covered_month ? new Date(`${p.covered_month}-01T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : 'no registrado (consulta el concepto)'
    const subject = `Recordatorio de pago · ${child?.full_name || 'Academy'}`
    const message = `Hola, familia. Os recordamos el saldo pendiente de ${child?.full_name || 'vuestro jugador'}:\nConcepto: ${p.description || p.type}.\nMes cubierto: ${period}.\nImporte pendiente: ${balance.remaining.toFixed(2)} €.\nVencimiento: ${due}.\nSi ya habéis realizado el pago, contactad con secretaría para comprobarlo antes de volver a pagar. Gracias, Academy Costa Brava.`
    const guardians = (links || []).flatMap(row => {
        const g = row.guardian as unknown as { id: string; full_name: string; email: string | null; phone: string | null } | null
        if (!g) return []
        let phone = (g.phone || '').replace(/\D/g, '')
        if (phone.length === 9) phone = `34${phone}`
        return [{ id: g.id, name: g.full_name, whatsapp: /^\d{10,15}$/.test(phone) ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null,
            email: g.email && z.string().email().safeParse(g.email).success ? `mailto:${g.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}` : null }]
    })
    return { message, guardians }
}
