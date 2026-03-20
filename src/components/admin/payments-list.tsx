'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createManualPayment, updatePaymentStatus, markPaymentAsPaid } from "@/app/actions/payments"
import { toast } from "sonner"
import { Plus, Check, Loader2, CreditCard, Euro, Clock, CheckCircle2, AlertCircle } from "lucide-react"

type PaymentsData = {
    memberships: any[]
    payments: any[]
}

export function PaymentsList({ paymentsData, plans, childId, onRefresh }: {
    paymentsData: PaymentsData, plans: any[], childId: string, onRefresh: () => void
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    const { memberships, payments } = paymentsData

    // Stats
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0)
    const paidCount = payments.filter(p => p.status === 'paid').length
    const pendingCount = payments.filter(p => p.status === 'pending').length

    const [formData, setFormData] = useState({
        plan_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        payment_status: 'pending'
    })

    const handlePlanChange = (value: string) => {
        const plan = plans.find(p => p.id === value)
        setFormData({
            ...formData,
            plan_id: value,
            end_date: plan ? calculateEndDate(formData.start_date, plan.duration_months) : ''
        })
    }

    const calculateEndDate = (start: string, months: number) => {
        const date = new Date(start)
        date.setMonth(date.getMonth() + months)
        return date.toISOString().split('T')[0]
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const result = await createManualPayment(childId, formData)
        if (result.success) {
            toast.success("Pago registrado")
            setOpen(false)
            onRefresh()
        } else {
            toast.error("Error: " + result.error)
        }
        setLoading(false)
    }

    const handleMarkMembershipPaid = async (id: string) => {
        setUpdatingId(id)
        const result = await updatePaymentStatus(id, 'paid', childId)
        if (result.success) {
            toast.success("Marcado como pagado")
            onRefresh()
        } else {
            toast.error("Error al actualizar")
        }
        setUpdatingId(null)
    }

    const handleMarkPaymentPaid = async (id: string) => {
        setUpdatingId(id)
        const result = await markPaymentAsPaid(id)
        if (result.success) {
            toast.success("Recibo marcado como pagado")
            onRefresh()
        } else {
            toast.error("Error al actualizar")
        }
        setUpdatingId(null)
    }

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Pagado</p>
                    <p className="text-xl font-black text-green-700">{totalPaid}€</p>
                    <p className="text-[10px] text-green-500">{paidCount} recibos</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Pendiente</p>
                    <p className="text-xl font-black text-amber-700">{totalPending}€</p>
                    <p className="text-[10px] text-amber-500">{pendingCount} recibos</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Membresías</p>
                    <p className="text-xl font-black text-blue-700">{memberships.length}</p>
                    <p className="text-[10px] text-blue-500">{memberships.filter(m => m.status === 'active').length} activas</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-center">
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md">
                                <Plus className="mr-2 h-4 w-4" /> Registrar Pago
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-slate-200 shadow-xl sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Registrar Nueva Cuota</DialogTitle>
                                <DialogDescription>Añade un pago manual o cuota para el alumno.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Concepto / Plan</Label>
                                    <Select onValueChange={handlePlanChange}>
                                        <SelectTrigger className="bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Selecciona un plan" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {plans.map(plan => (
                                                <SelectItem key={plan.id} value={plan.id}>{plan.name} - {plan.price}€</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Fecha Inicio</Label>
                                        <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required className="bg-slate-50 border-slate-200" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Fecha Fin</Label>
                                        <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required className="bg-slate-50 border-slate-200" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Estado del Pago</Label>
                                    <Select onValueChange={(v) => setFormData({ ...formData, payment_status: v })} defaultValue="pending">
                                        <SelectTrigger className="bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                            <SelectItem value="paid">Pagado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-11">
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar Pago
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Memberships */}
            {memberships.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <CreditCard className="h-3 w-3" /> Suscripciones Activas
                    </h4>
                    {memberships.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${m.status === 'active' ? 'bg-green-50' : 'bg-slate-50'}`}>
                                    <Euro className={`h-5 w-5 ${m.status === 'active' ? 'text-green-600' : 'text-slate-400'}`} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-900">{m.plan?.name || 'Plan personalizado'}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <span>{new Date(m.start_date).toLocaleDateString()} → {new Date(m.end_date).toLocaleDateString()}</span>
                                        {m.payment_method && <span>• {m.payment_method === 'efectivo' ? '💵' : m.payment_method === 'transferencia' ? '🏦' : '💳'} {m.payment_method}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-black text-yellow-600">{m.monthly_price || m.plan?.price || 0}€</span>
                                <span className="text-[10px] text-slate-400">/{m.plan?.frequency === 'mensual' ? 'mes' : m.plan?.frequency === 'trimestral' ? 'trim.' : 'año'}</span>
                                <Badge className={`text-xs ${m.payment_status === 'paid'
                                    ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} border-none`}>
                                    {m.payment_status === 'paid' ? '✓ Pagado' : '⏳ Pendiente'}
                                </Badge>
                                {m.payment_status !== 'paid' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleMarkMembershipPaid(m.id)}
                                        disabled={updatingId === m.id}
                                    >
                                        {updatingId === m.id ?
                                            <Loader2 className="h-4 w-4 animate-spin" /> :
                                            <Check className="h-4 w-4 text-green-600" />
                                        }
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Individual Payment Records (monthly) */}
            {payments.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> Historial de Recibos ({payments.length})
                    </h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {payments.map((p: any) => (
                            <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${p.status === 'paid'
                                ? 'bg-green-50/30 border-green-100' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    {p.status === 'paid' ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-amber-500" />
                                    )}
                                    <div>
                                        <p className="font-bold text-xs text-slate-900">{p.description || `Pago ${p.type}`}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {p.method === 'efectivo' ? '💵 Efectivo' : p.method === 'transferencia' ? '🏦 Transfer.' : '💳 Tarjeta'}
                                            {p.paid_at && ` • ${new Date(p.paid_at).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`font-black text-sm ${p.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                        {p.amount}€
                                    </span>
                                    {p.status !== 'paid' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-green-600 hover:bg-green-50"
                                            onClick={() => handleMarkPaymentPaid(p.id)}
                                            disabled={updatingId === p.id}
                                        >
                                            {updatingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓ Cobrar'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {memberships.length === 0 && payments.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Euro className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                    <p className="font-bold text-sm">No hay pagos registrados</p>
                    <p className="text-xs">Inscribe al alumno en la academia para generar recibos automáticos</p>
                </div>
            )}
        </div>
    )
}
