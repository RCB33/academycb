'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
    DollarSign, TrendingUp, Wallet, Download,
    Calendar, ShoppingBag, GraduationCap, Tent, Trophy, CreditCard, Users,
    Plus, Trash2, Loader2, CheckCircle2, AlertCircle, Euro, FileText, ChevronLeft, ChevronRight,
    Search, X, Pencil, RotateCcw
} from "lucide-react"
import {
    createExpense,
    deleteExpense,
    getFinanceOverview,
    getMonthlyPaymentGrid,
    recordManualPayment,
    setPaymentStatus,
    updateExpense,
    type Expense,
    type FinanceKPIs,
    type FinanceStudentOption,
    type FinanceTransaction,
    type MonthlyPaymentRow,
} from "@/app/actions/finance"
import { toast } from "sonner"

const TYPE_CFG: Record<string, { label: string, icon: React.ReactNode, color: string }> = {
    'cuota': { label: 'Cuota', icon: <GraduationCap className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700' },
    'campus': { label: 'Campus', icon: <Tent className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700' },
    'torneo': { label: 'Torneo', icon: <Trophy className="h-3.5 w-3.5" />, color: 'bg-yellow-100 text-yellow-700' },
    'tienda': { label: 'Tienda', icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700' },
    'pago': { label: 'Pago', icon: <CreditCard className="h-3.5 w-3.5" />, color: 'bg-slate-100 text-slate-700' },
    'gasto': { label: 'Gasto', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-700' },
}

const STATUS_CFG: Record<string, { label: string, color: string }> = {
    'paid': { label: 'Cobrado', color: 'bg-green-100 text-green-700' },
    'pending': { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
    'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
    'overdue': { label: 'Vencido', color: 'bg-red-100 text-red-700' },
    'refunded': { label: 'Reembolsado', color: 'bg-slate-100 text-slate-600' },
    'failed': { label: 'Fallido', color: 'bg-red-100 text-red-700' },
}

export default function FinancePage() {
    const [kpis, setKpis] = useState<FinanceKPIs | null>(null)
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [paymentGrid, setPaymentGrid] = useState<MonthlyPaymentRow[]>([])
    const [students, setStudents] = useState<FinanceStudentOption[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingCobros, setLoadingCobros] = useState(false)
    const [activeTab, setActiveTab] = useState('general')
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
    const [manualPaymentOpen, setManualPaymentOpen] = useState(false)
    const [savingExpense, setSavingExpense] = useState(false)
    const [savingManual, setSavingManual] = useState(false)
    const [markingId, setMarkingId] = useState<string | null>(null)
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
    
    // Cobros filters
    const [cobrosSearch, setCobrosSearch] = useState('')
    const [cobrosFilter, setCobrosFilter] = useState<'all' | 'pending' | 'paid'>('all')
    
    // Month picker
    const now = new Date()
    const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const overview = await getFinanceOverview(selectedMonth)
            setKpis(overview.kpis)
            setTransactions(overview.transactions)
            setExpenses(overview.expenses)
            setStudents(overview.students)
        } catch (error) {
            console.error(error)
            toast.error('No se pudieron cargar los datos financieros')
        } finally {
            setLoading(false)
        }
    }, [selectedMonth])

    const fetchPaymentGrid = useCallback(async () => {
        setLoadingCobros(true)
        try {
            const grid = await getMonthlyPaymentGrid(selectedMonth)
            setPaymentGrid(grid)
        } finally {
            setLoadingCobros(false)
        }
    }, [selectedMonth])

    useEffect(() => { void fetchAll() }, [fetchAll])

    useEffect(() => {
        if (activeTab === 'cobros') void fetchPaymentGrid()
    }, [activeTab, fetchPaymentGrid])

    function navigateMonth(delta: number) {
        const [y, m] = selectedMonth.split('-').map(Number)
        const d = new Date(y, m - 1 + delta)
        setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString('es', { month: 'long', year: 'numeric' })

    // Cobros stats & filtering
    const filteredGrid = useMemo(() => {
        let result = paymentGrid
        if (cobrosSearch) {
            const q = cobrosSearch.toLowerCase()
            result = result.filter(r => r.childName.toLowerCase().includes(q) || (r.planName || '').toLowerCase().includes(q))
        }
        if (cobrosFilter === 'pending') result = result.filter(r => ['pending', 'overdue', 'failed'].includes(r.status))
        if (cobrosFilter === 'paid') result = result.filter(r => r.status === 'paid')
        return result
    }, [paymentGrid, cobrosSearch, cobrosFilter])

    const gridPaidTotal = paymentGrid.filter(g => g.status === 'paid').reduce((sum, g) => sum + (g.amount || 0), 0)
    const gridPendingTotal = paymentGrid.filter(g => ['pending', 'overdue', 'failed'].includes(g.status)).reduce((sum, g) => sum + (g.amount || 0), 0)
    const gridTotalAmount = gridPaidTotal + gridPendingTotal
    const gridPaidPct = gridTotalAmount > 0 ? Math.round((gridPaidTotal / gridTotalAmount) * 100) : 0

    async function handlePaymentStatus(paymentId: string, status: 'paid' | 'pending') {
        setMarkingId(paymentId)
        const res = await setPaymentStatus(paymentId, status)
        if (res.success) {
            toast.success(status === 'paid' ? 'Cobro registrado' : 'Cobro reabierto')
            await Promise.all([fetchPaymentGrid(), fetchAll()])
        } else toast.error(res.error || 'Error')
        setMarkingId(null)
    }

    async function handleCreateExpense(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavingExpense(true)
        const fd = new FormData(e.currentTarget)
        const expenseData = {
            concept: fd.get('concept') as string,
            amount: parseFloat(fd.get('amount') as string),
            category: fd.get('category') as string,
            date: fd.get('date') as string,
            notes: (fd.get('notes') as string) || undefined
        }
        const res = editingExpense
            ? await updateExpense(editingExpense.id, expenseData)
            : await createExpense(expenseData)
        setSavingExpense(false)
        if (res.success) {
            toast.success(editingExpense ? 'Gasto actualizado' : 'Gasto registrado')
            setExpenseDialogOpen(false)
            setEditingExpense(null)
            await fetchAll()
        } else toast.error(res.error)
    }

    async function handleManualPayment(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavingManual(true)
        const fd = new FormData(e.currentTarget)
        const res = await recordManualPayment({
            child_id: (fd.get('child_id') as string) || null,
            amount: parseFloat(fd.get('amount') as string),
            type: fd.get('type') as string,
            method: fd.get('method') as string,
            description: fd.get('description') as string,
            date: fd.get('date') as string,
        })
        setSavingManual(false)
        if (res.success) {
            toast.success("Pago registrado correctamente")
            setManualPaymentOpen(false)
            await fetchAll()
        } else toast.error(res.error)
    }

    async function handleDeleteExpense(id: string) {
        if (!confirm('¿Eliminar este gasto?')) return
        const res = await deleteExpense(id)
        if (res.success) {
            setExpenses(prev => prev.filter(e => e.id !== id))
            toast.success('Gasto archivado')
            await fetchAll()
        } else toast.error(res.error)
    }

    function exportCSV() {
        const cell = (value: string | number | null | undefined) => `"${String(value ?? '').replaceAll('"', '""')}"`
        let csv = '\uFEFFConcepto;Tipo;Fecha;Estado;Método;Importe\n'
        transactions.forEach(tx => {
            csv += [
                cell(tx.concept), cell(tx.type), cell(new Date(tx.date).toLocaleDateString('es-ES')),
                cell(tx.status), cell(tx.method), cell(tx.amount),
            ].join(';') + '\n'
        })
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `finanzas_${selectedMonth}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("CSV exportado")
    }

    const fmt = (n: number) => n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const totalExpenses = kpis?.monthlyExpenses || 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-yellow-500" />
                        Control Financiero
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Gestión centralizada de cobros, pagos y gastos
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setManualPaymentOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md">
                        <Plus className="mr-2 h-4 w-4" /> 💰 Registrar Ingreso
                    </Button>
                    <Button onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true) }} className="bg-red-500 hover:bg-red-600 text-white font-bold shadow-md">
                        <Plus className="mr-2 h-4 w-4" /> 📝 Registrar Gasto
                    </Button>
                    <Button onClick={exportCSV} variant="outline" className="bg-white border-slate-200 shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> CSV
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-md bg-white">
                <CardContent className="py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Periodo contable</p>
                        <p className="text-sm text-slate-600">Todos los totales, movimientos y gastos corresponden al mismo mes.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateMonth(-1)} aria-label="Mes anterior">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-base font-black text-slate-900 capitalize min-w-[170px] text-center">{monthLabel}</span>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateMonth(1)} aria-label="Mes siguiente">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* KPI ROW */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <KpiCard label="Cobrado" value={loading ? '...' : `${fmt(kpis?.totalRevenue || 0)}€`}
                    subtitle="En el periodo" color="yellow" icon={<DollarSign className="h-4 w-4" />} />
                <KpiCard label="Pendiente" value={loading ? '...' : `${fmt(kpis?.pendingPayments || 0)}€`}
                    subtitle="Vence este periodo" color="amber" icon={<Wallet className="h-4 w-4" />} />
                <KpiCard label="Vencido" value={loading ? '...' : `${fmt(kpis?.overduePayments || 0)}€`}
                    subtitle={`${kpis?.overdueCount || 0} recibos`} color="red" icon={<AlertCircle className="h-4 w-4" />} />
                <KpiCard label="Alumnos Activos" value={loading ? '...' : String(kpis?.activeStudents || 0)}
                    subtitle="Con membresía" color="blue" icon={<Users className="h-4 w-4" />} />
                <KpiCard label="Gastos" value={loading ? '...' : `${fmt(totalExpenses)}€`}
                    subtitle="En el periodo" color="red" icon={<FileText className="h-4 w-4" />} />
                <KpiCard label="Resultado Neto" value={loading ? '...' : `${fmt(kpis?.netProfit || 0)}€`}
                    subtitle="Cobrado - gastos" color="green" icon={<TrendingUp className="h-4 w-4" />} />
            </div>

            {/* TABS */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-white border shadow-sm p-1 h-auto">
                    <TabsTrigger value="general" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        📊 Vista General
                    </TabsTrigger>
                    <TabsTrigger value="cobros" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        💰 Cobros del Mes
                    </TabsTrigger>
                    <TabsTrigger value="gastos" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        📝 Gastos
                    </TabsTrigger>
                </TabsList>

                {/* ══════════════ TAB: Vista General ══════════════ */}
                <TabsContent value="general" className="space-y-6">
                    {/* Revenue Breakdown */}
                    <div className="grid gap-6 lg:grid-cols-7">
                        <Card className="lg:col-span-5 border-none shadow-xl bg-white">
                            <CardHeader className="border-b border-slate-50 pb-4">
                                <CardTitle className="text-lg font-bold">Desglose por Fuente</CardTitle>
                                <CardDescription>Distribución de ingresos confirmados</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {kpis && (
                                    <div className="space-y-4">
                                        {kpis.revenueBySource.filter(r => r.amount > 0).map((source) => {
                                            const total = kpis.totalRevenue || 1
                                            const pct = Math.round((source.amount / total) * 100)
                                            const colorMap: Record<string, string> = {
                                                'Cuotas': 'bg-blue-500', 'Campus': 'bg-green-500',
                                                'Torneos': 'bg-yellow-500', 'Tienda': 'bg-purple-500', 'Otros': 'bg-slate-400'
                                            }
                                            return (
                                                <div key={source.source} className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-bold text-slate-700">{source.source}</span>
                                                        <span className="text-sm font-black text-slate-900">{fmt(source.amount)}€ <span className="text-xs text-slate-400 font-medium">({pct}%)</span></span>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${colorMap[source.source] || 'bg-slate-400'}`}
                                                            style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {kpis.revenueBySource.every(r => r.amount === 0) && (
                                            <div className="text-center py-10 text-sm text-slate-400">No hay ingresos registrados aún</div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2 border-none shadow-xl bg-slate-900 text-white overflow-hidden relative">
                            <div className="absolute top-[-20px] right-[-20px] h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />
                            <CardHeader>
                                <CardTitle className="text-lg font-bold">Resumen</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-2">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                        <span>Cobrado</span><span className="text-green-400">{loading ? '...' : `${fmt(kpis?.totalRevenue || 0)}€`}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-400 rounded-full" style={{
                                            width: `${kpis && (kpis.totalRevenue + kpis.pendingPayments) > 0 ? Math.round((kpis.totalRevenue / (kpis.totalRevenue + kpis.pendingPayments)) * 100) : 0}%`
                                        }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                        <span>Pendiente</span><span className="text-amber-400">{loading ? '...' : `${fmt(kpis?.pendingPayments || 0)}€`}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-400 rounded-full" style={{
                                            width: `${kpis && (kpis.totalRevenue + kpis.pendingPayments) > 0 ? Math.round((kpis.pendingPayments / (kpis.totalRevenue + kpis.pendingPayments)) * 100) : 0}%`
                                        }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                        <span>Gastos</span><span className="text-red-400">{fmt(totalExpenses)}€</span>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-white/10">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-300">Beneficio Neto</span>
                                        <span className="text-yellow-400 text-lg font-black">{fmt((kpis?.totalRevenue || 0) - totalExpenses)}€</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Transactions Table */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-5">
                            <div>
                                <CardTitle className="text-lg font-bold">Últimos Movimientos</CardTitle>
                                <CardDescription>Transacciones de todos los departamentos</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                                        <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-6">Concepto</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Tipo</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Fecha</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Estado</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-6">Importe</TableHead>
                                        <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-6">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground animate-pulse">Cargando...</TableCell></TableRow>
                                    ) : transactions.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No hay movimientos en {monthLabel}</TableCell></TableRow>
                                    ) : transactions.map((tx) => {
                                        const typeCfg = TYPE_CFG[tx.type] || TYPE_CFG.pago
                                        const statusCfg = STATUS_CFG[tx.status] || STATUS_CFG.pending
                                        return (
                                            <TableRow key={`${tx.type}-${tx.id}`} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                                <TableCell className="py-3.5 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm
                                                            ${tx.type === 'cuota' ? 'bg-blue-50 text-blue-500' :
                                                            tx.type === 'campus' ? 'bg-green-50 text-green-500' :
                                                            tx.type === 'torneo' ? 'bg-yellow-50 text-yellow-500' :
                                                            tx.type === 'tienda' ? 'bg-purple-50 text-purple-500' :
                                                            tx.type === 'gasto' ? 'bg-red-50 text-red-500' :
                                                            'bg-slate-50 text-slate-400'}`}>
                                                            {typeCfg.icon}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-900 max-w-[250px] truncate">{tx.concept}</div>
                                                            <div className="text-[10px] text-slate-400">{tx.id.slice(0, 8)}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell><Badge className={`${typeCfg.color} border-none font-bold text-[10px] uppercase`}>{typeCfg.label}</Badge></TableCell>
                                                <TableCell className="text-xs font-medium text-slate-500">{new Date(tx.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</TableCell>
                                                <TableCell><Badge className={`${statusCfg.color} border-none font-bold text-[10px] uppercase`}>{tx.type === 'gasto' ? 'Registrado' : statusCfg.label}</Badge></TableCell>
                                                <TableCell className="text-right py-3.5 pr-6">
                                                    <span className={`text-base font-black ${tx.type === 'gasto' ? 'text-red-600' : tx.status === 'paid' ? 'text-slate-900' : ['pending', 'overdue', 'failed'].includes(tx.status) ? 'text-amber-600' : 'text-slate-300 line-through'}`}>
                                                        {tx.amount.toLocaleString('es', { minimumFractionDigits: 2 })}€
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {tx.paymentId && ['pending', 'overdue', 'failed'].includes(tx.status) ? (
                                                        <Button size="sm" className="h-8 bg-green-500 hover:bg-green-600 text-white text-xs font-bold" disabled={markingId === tx.paymentId} onClick={() => handlePaymentStatus(tx.paymentId!, 'paid')}>
                                                            {markingId === tx.paymentId ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓ Cobrar'}
                                                        </Button>
                                                    ) : tx.paymentId && tx.status === 'paid' ? (
                                                        <Button size="sm" variant="ghost" className="h-8 text-[10px] text-slate-400 hover:text-amber-600" disabled={markingId === tx.paymentId} onClick={() => handlePaymentStatus(tx.paymentId!, 'pending')}>
                                                            <RotateCcw className="h-3 w-3 mr-1" /> Deshacer
                                                        </Button>
                                                    ) : <span className="text-slate-300">—</span>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══════════════ TAB: Cobros del Mes ══════════════ */}
                <TabsContent value="cobros" className="space-y-4">
                    {/* Collection controls + % bar */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-black text-slate-900 capitalize">Cobros de {monthLabel}</p>
                                <p className="text-xs text-slate-500">Solo aparecen recibos con vencimiento en este periodo.</p>
                            </div>
                            <Button onClick={() => setManualPaymentOpen(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                                <Plus className="mr-2 h-4 w-4" /> Registrar Pago Manual
                            </Button>
                        </div>

                        {/* Collection Progress */}
                        <Card className="border-none shadow-lg bg-white p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
                                    <Badge className="bg-green-100 text-green-700 border-none text-sm px-4 py-1.5">
                                        ✓ Cobrado: {fmt(gridPaidTotal)}€
                                    </Badge>
                                    <Badge className="bg-amber-100 text-amber-700 border-none text-sm px-4 py-1.5">
                                        ⏳ Pendiente: {fmt(gridPendingTotal)}€
                                    </Badge>
                                </div>
                                <span className="text-2xl font-black text-slate-900">{gridPaidPct}%</span>
                            </div>
                            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700" style={{ width: `${gridPaidPct}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {paymentGrid.filter(g => g.status === 'paid').length} de {paymentGrid.length} recibos cobrados
                            </p>
                        </Card>

                        {/* Search + Filters */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar alumno por nombre..."
                                    value={cobrosSearch}
                                    onChange={e => setCobrosSearch(e.target.value)}
                                    className="pl-10 bg-white border-slate-200"
                                />
                                {cobrosSearch && (
                                    <button onClick={() => setCobrosSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <X className="h-4 w-4 text-slate-400" />
                                    </button>
                                )}
                            </div>
                            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
                                {[
                                    { key: 'all' as const, label: 'Todos' },
                                    { key: 'pending' as const, label: '⏳ Pendientes' },
                                    { key: 'paid' as const, label: '✓ Cobrados' },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setCobrosFilter(f.key)}
                                        className={`px-4 py-2 text-xs font-bold transition-all ${cobrosFilter === f.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Payment Grid */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardContent className="p-0">
                            {loadingCobros ? (
                                <div className="text-center py-16 text-slate-400"><Loader2 className="h-7 w-7 mx-auto animate-spin" /></div>
                            ) : filteredGrid.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Euro className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-bold">{paymentGrid.length === 0 ? 'No hay cobros para este mes' : 'No se encontraron resultados'}</p>
                                    <p className="text-xs">
                                        {paymentGrid.length === 0
                                            ? 'Inscribe alumnos en Academia para generar cobros automáticos'
                                            : 'Prueba con otros filtros o búsqueda'}
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-6">Alumno</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Categoría</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Plan</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Método</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Vencimiento</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Importe</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Estado</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-6">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGrid.map((row) => (
                                            <TableRow key={row.paymentId} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${row.status === 'paid' ? 'bg-green-50/20' : row.status === 'overdue' ? 'bg-red-50/20' : ''}`}>
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${row.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {row.childName.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-sm text-slate-900">{row.childName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{row.categoryName || '—'}</TableCell>
                                                <TableCell className="text-xs font-medium text-slate-700">{row.planName || '—'}</TableCell>
                                                <TableCell>
                                                    <span className="text-xs">
                                                        {['efectivo', 'cash'].includes(row.paymentMethod || '') ? '💵' : ['transferencia', 'transfer'].includes(row.paymentMethod || '') ? '🏦' : '💳'} {row.paymentMethod || 'N/D'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{row.dueDate ? new Date(`${row.dueDate}T12:00:00`).toLocaleDateString('es-ES') : '—'}</TableCell>
                                                <TableCell><span className="font-black text-sm text-slate-900">{row.amount}€</span></TableCell>
                                                <TableCell>
                                                    {row.status === 'paid' ? (
                                                        <Badge className="bg-green-100 text-green-700 border-none text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Pagado</Badge>
                                                    ) : row.status === 'overdue' ? (
                                                        <Badge className="bg-red-100 text-red-700 border-none text-[10px]"><AlertCircle className="h-3 w-3 mr-1" /> Vencido</Badge>
                                                    ) : row.status === 'failed' ? (
                                                        <Badge className="bg-red-100 text-red-700 border-none text-[10px]"><AlertCircle className="h-3 w-3 mr-1" /> Fallido</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]"><AlertCircle className="h-3 w-3 mr-1" /> Pendiente</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {row.status !== 'paid' ? (
                                                        <Button
                                                            size="sm"
                                                            className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold h-8"
                                                            disabled={markingId === row.paymentId}
                                                            onClick={() => handlePaymentStatus(row.paymentId, 'paid')}
                                                        >
                                                            {markingId === row.paymentId ? <Loader2 className="h-3 w-3 animate-spin" /> : <>✓ Cobrar</>}
                                                        </Button>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className="text-[10px] text-green-500">{row.paidAt ? new Date(row.paidAt).toLocaleDateString('es-ES') : 'Cobrado'}</span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 px-2 text-[10px] text-slate-400 hover:text-amber-600"
                                                                disabled={markingId === row.paymentId}
                                                                onClick={() => handlePaymentStatus(row.paymentId, 'pending')}
                                                            >
                                                                <RotateCcw className="h-3 w-3 mr-1" /> Deshacer
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══════════════ TAB: Gastos ══════════════ */}
                <TabsContent value="gastos" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-lg font-black text-slate-900 capitalize">Gastos de {monthLabel}</p>
                            <p className="text-xs text-slate-500">Los gastos archivados se conservan en el historial contable.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge className="bg-red-100 text-red-700 border-none text-sm px-4 py-1.5">Total: {fmt(totalExpenses)}€</Badge>
                            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true) }}>
                                <Plus className="h-4 w-4 mr-2" /> Nuevo Gasto
                            </Button>
                        </div>
                    </div>

                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardContent className="p-0">
                            {expenses.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <FileText className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-bold">No hay gastos este mes</p>
                                    <p className="text-xs">Registra gastos para un control financiero completo</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-6">Concepto</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Categoría</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Fecha</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Notas</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Importe</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-6"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.map(exp => (
                                            <TableRow key={exp.id} className="border-b border-slate-50 hover:bg-red-50/20 transition-colors group">
                                                <TableCell className="pl-6 font-bold text-sm text-slate-900">{exp.concept}</TableCell>
                                                <TableCell><Badge className="bg-slate-100 text-slate-600 border-none text-[10px] uppercase">{exp.category}</Badge></TableCell>
                                                <TableCell className="text-xs text-slate-500">{new Date(`${exp.date}T12:00:00`).toLocaleDateString('es-ES')}</TableCell>
                                                <TableCell className="text-xs text-slate-400 max-w-[200px] truncate">{exp.notes || '—'}</TableCell>
                                                <TableCell className="text-right font-black text-red-600">{exp.amount}€</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingExpense(exp); setExpenseDialogOpen(true) }} title="Editar gasto">
                                                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteExpense(exp.id)} title="Archivar gasto">
                                                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ══════════════ DIALOG: Registrar Pago Manual ══════════════ */}
            <Dialog open={manualPaymentOpen} onOpenChange={setManualPaymentOpen}>
                <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl">
                    <div className="bg-yellow-500 p-5 flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                            <CreditCard className="h-6 w-6 text-black" />
                        </div>
                        <DialogTitle className="text-lg font-black text-black tracking-tight uppercase">
                            Registrar Ingreso
                        </DialogTitle>
                    </div>
                    <form onSubmit={handleManualPayment} className="p-5 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Descripción *</Label>
                            <Input name="description" required placeholder="Ej. Patrocinio, ingreso extraordinario..." className="bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Importe (€) *</Label>
                                <Input name="amount" type="number" min="0.01" step="0.01" required placeholder="40.00" className="bg-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Fecha de cobro *</Label>
                                <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="bg-white" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Clasificación</Label>
                                <select name="type" defaultValue="other" className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                                    <option value="other">📦 Otro ingreso</option>
                                    <option value="academy">🎓 Academia extra</option>
                                    <option value="campus">🏕️ Campus extra</option>
                                    <option value="tournament">🏆 Torneo extra</option>
                                    <option value="shop">🛍️ Tienda extra</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Alumno (opcional)</Label>
                                <select name="child_id" defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                                    <option value="">Sin vincular</option>
                                    {students.map(student => <option key={student.id} value={student.id}>{student.full_name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Método de Pago</Label>
                            <select name="method" className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                                <option value="efectivo">💵 Efectivo</option>
                                <option value="transferencia">🏦 Transferencia</option>
                                <option value="tarjeta">💳 Tarjeta</option>
                            </select>
                        </div>
                        <p className="text-[10px] text-slate-400">Para cobrar una cuota existente usa el botón “Cobrar”; este formulario registra ingresos extraordinarios sin duplicar recibos.</p>
                        <div className="pt-3 flex justify-end gap-3 border-t">
                            <Button type="button" variant="ghost" onClick={() => setManualPaymentOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={savingManual} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6">
                                {savingManual && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Registrar Ingreso
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ══════════════ DIALOG: Registrar Gasto ══════════════ */}
            <Dialog open={expenseDialogOpen} onOpenChange={(open) => { setExpenseDialogOpen(open); if (!open) setEditingExpense(null) }}>
                <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl">
                    <div className="bg-red-500 p-5 flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <DialogTitle className="text-lg font-black text-white tracking-tight uppercase">
                            {editingExpense ? 'Editar Gasto' : 'Registrar Gasto'}
                        </DialogTitle>
                    </div>
                    <form key={editingExpense?.id || 'new-expense'} onSubmit={handleCreateExpense} className="p-5 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Concepto *</Label>
                            <Input name="concept" required defaultValue={editingExpense?.concept || ''} placeholder="Ej. Alquiler campo, Material..." className="bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Importe (€)</Label>
                                <Input name="amount" type="number" min="0.01" step="0.01" required defaultValue={editingExpense?.amount || ''} placeholder="150" className="bg-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Fecha</Label>
                                <Input name="date" type="date" required defaultValue={editingExpense?.date || new Date().toISOString().split('T')[0]} className="bg-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Categoría</Label>
                            <select name="category" defaultValue={editingExpense?.category || 'instalaciones'} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                                <option value="instalaciones">🏟️ Instalaciones</option>
                                <option value="material">⚽ Material Deportivo</option>
                                <option value="personal">👥 Personal</option>
                                <option value="transporte">🚌 Transporte</option>
                                <option value="marketing">📢 Marketing</option>
                                <option value="seguros">🛡️ Seguros</option>
                                <option value="otros">📦 Otros</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Notas</Label>
                            <Input name="notes" defaultValue={editingExpense?.notes || ''} placeholder="Observaciones..." className="bg-white" />
                        </div>
                        <div className="pt-3 flex justify-end gap-3 border-t">
                            <Button type="button" variant="ghost" onClick={() => setExpenseDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={savingExpense} className="bg-black hover:bg-slate-800 text-white font-bold px-6">
                                {savingExpense && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingExpense ? 'Guardar cambios' : 'Registrar Gasto'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── KPI Card ───
function KpiCard({ label, value, subtitle, color, icon }: {
    label: string, value: string, subtitle: string, color: string, icon: React.ReactNode
}) {
    const colors: Record<string, { bar: string, bg: string, text: string }> = {
        yellow: { bar: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-500' },
        amber: { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-500' },
        blue: { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-500' },
        red: { bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-500' },
        green: { bar: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-500' },
    }
    const c = colors[color] || colors.yellow
    return (
        <Card className="border-none shadow-lg bg-white overflow-hidden group">
            <div className={`h-1.5 ${c.bar}`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</CardTitle>
                <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center ${c.text} group-hover:scale-110 transition-transform`}>{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-slate-900">{value}</div>
                <div className={`flex items-center gap-1 mt-1 font-bold text-xs ${c.text}`}>{subtitle}</div>
            </CardContent>
        </Card>
    )
}
