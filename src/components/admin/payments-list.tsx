'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { createManualPayment, updatePaymentStatus } from "@/app/actions/payments"
import { toast } from "sonner"
import { Plus, Check, Loader2 } from "lucide-react"

export function PaymentsList({ payments, plans, childId, onRefresh }: { payments: any[], plans: any[], childId: string, onRefresh: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    // Form State for New Payment
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
            // Calculate end date based on plan duration
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

    const handleMarkAsPaid = async (id: string) => {
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Historial de Cuotas</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md"><Plus className="mr-2 h-4 w-4" /> Registrar Pago</Button>
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

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Periodo</TableHead>
                            <TableHead>Importe</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No hay pagos registrados
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-medium">{payment.plan?.name || 'Pago Manual'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(payment.start_date).toLocaleDateString()} - {new Date(payment.end_date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>{payment.plan?.price}€</TableCell>
                                    <TableCell>
                                        <Badge variant={payment.payment_status === 'paid' ? 'default' : 'secondary'} className={payment.payment_status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'}>
                                            {payment.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {payment.payment_status !== 'paid' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleMarkAsPaid(payment.id)}
                                                disabled={updatingId === payment.id}
                                            >
                                                {updatingId === payment.id ?
                                                    <Loader2 className="h-4 w-4 animate-spin" /> :
                                                    <Check className="h-4 w-4 text-green-600" />
                                                }
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
