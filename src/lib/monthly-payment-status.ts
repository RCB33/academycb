import { receiptBalance, type ReceiptAllocation } from './receipt-balance'

export type MonthlyReceipt = { amount:number|string; status:string; concept_code?:string|null; covered_month?:string|null; type?:string|null; manual_receipt_allocations?:ReceiptAllocation[]|null }
export type MonthlyStatus = 'paid'|'partial'|'pending'|'waived'|'missing'
export function monthlyPaymentStatus(payments:MonthlyReceipt[], month:string):MonthlyStatus {
    const rows=payments.filter(p=>p.type==='academy'&&p.concept_code==='monthly'&&p.covered_month===month&&!['cancelled','refunded'].includes(p.status))
    if(!rows.length) return 'missing'
    const total=rows.reduce((n,p)=>n+Math.round(Number(p.amount)*100),0)
    if(total===0) return 'waived'
    if(rows.every(p=>receiptBalance(p).remaining===0)) return 'paid'
    return rows.some(p=>receiptBalance(p).paid>0)?'partial':'pending'
}
export function agreedAcademyMethod(method?:string|null,legacy?:string|null) {
    if(method==='cash') return 'Efectivo'
    if(method==='stripe') return 'Tarjeta · Stripe'
    if(legacy==='stripe') return 'Stripe registrado · revisar acuerdo'
    return 'Forma de pago por revisar'
}
