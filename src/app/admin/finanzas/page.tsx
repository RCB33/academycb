'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
    DollarSign, TrendingUp, Wallet, Download,
    Calendar, ShoppingBag, GraduationCap, Tent, Trophy, CreditCard, Users,
    Plus, Trash2, Loader2, CheckCircle2, AlertCircle, Euro, FileText, ChevronLeft, ChevronRight,
    Search, Filter, X, ArrowUpRight
} from "lucide-react"
import { getFinanceKPIs, getFinanceTransactions, type FinanceTransaction, type FinanceKPIs } from "@/app/actions/finance"
import { getExpenses, createExpense, deleteExpense, getMonthlyPaymentGrid, getPlans, type Expense } from "@/app/actions/settings"
import { markPaymentAsPaid, updatePaymentStatus } from "@/app/actions/payments"
import { recordManualPayment } from "@/app/actions/settings"
import { toast } from "sonner"

const TYPE_CFG: Record<string, { label: string, icon: React.ReactNode, color: string }> = {
    'cuota': { label: 'Cuota', icon: <GraduationCap className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700' },
    'campus': { label: 'Campus', icon: <Tent className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700' },
    'torneo': { label: 'Torneo', icon: <Trophy className="h-3.5 w-3.5" />, color: 'bg-yellow-100 text-yellow-700' },
    'tienda': { label: 'Tienda', icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700' },
    'pago': { label: 'Pago', icon: <CreditCard className="h-3.5 w-3.5" />, color: 'bg-slate-100 text-slate-700' },
}

const STATUS_CFG: Record<string, { label: string, color: string }> = {
    'paid': { label: 'Cobrado', color: 'bg-green-100 text-green-700' },
    'pending': { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
    'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

export default function FinancePage() {
    const [kpis, setKpis] = useState<FinanceKPIs | null>(null)
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [paymentGrid, setPaymentGrid] = useState<any[]>([])
    const [plans, setPlans] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('general')
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
    const [manualPaymentOpen, setManualPaymentOpen] = useState(false)
    const [savingExpense, setSavingExpense] = useState(false)
    const [savingManual, setSavingManual] = useState(false)
    const [markingId, setMarkingId] = useState<string | null>(null)
    
    // Cobros filters
    const [cobrosSearch, setCobrosSearch] = useState('')
    const [cobrosFilter, setCobrosFilter] = useState<'all' | 'pending' | 'paid'>('all')
    
    // Month picker
    const now = new Date()
    const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

    useEffect(() => { fetchAll() }, [])

    useEffect(() => {
        if (activeTab === 'cobros') fetchPaymentGrid()
        if (activeTab === 'gastos') fetchExpenses()
    }, [activeTab, selectedMonth])

    async function fetchAll() {
        setLoading(true)
        const [k, t, p] = await Promise.all([getFinanceKPIs(), getFinanceTransactions(), getPlans()])
        setKpis(k)
        setTransactions(t)
        setPlans(p)
        setLoading(false)
    }

    async function fetchPaymentGrid() {
        const grid = await getMonthlyPaymentGrid(selectedMonth)
        setPaymentGrid(grid)
    }

    async function fetchExpenses() {
        const exp = await getExpenses(selectedMonth)
        setExpenses(exp)
    }

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
        if (cobrosFilter === 'pending') result = result.filter(r => r.status !== 'paid')
        if (cobrosFilter === 'paid') result = result.filter(r => r.status === 'paid')
        return result
    }, [paymentGrid, cobrosSearch, cobrosFilter])

    const gridPaidTotal = paymentGrid.filter(g => g.status === 'paid').reduce((sum, g) => sum + (g.amount || 0), 0)
    const gridPendingTotal = paymentGrid.filter(g => g.status !== 'paid').reduce((sum, g) => sum + (g.amount || 0), 0)
    const gridTotalAmount = gridPaidTotal + gridPendingTotal
    const gridPaidPct = gridTotalAmount > 0 ? Math.round((gridPaidTotal / gridTotalAmount) * 100) : 0

    async function handleMarkPaid(paymentId: string | null, membershipId: string) {
        if (!paymentId) {
            // No payment record exists, mark membership directly
            setMarkingId(membershipId)
            const res = await updatePaymentStatus(membershipId, 'paid', '')
            if (res.success) {
                toast.success("Marcado como pagado")
                fetchPaymentGrid()
                fetchAll()
            } else toast.error(res.error || 'Error')
            setMarkingId(null)
            return
        }
        setMarkingId(paymentId)
        const res = await markPaymentAsPaid(paymentId)
        if (res.success) {
            toast.success("Cobro registrado")
            fetchPaymentGrid()
            fetchAll()
        } else toast.error(res.error || 'Error')
        setMarkingId(null)
    }

    async function handleCreateExpense(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavingExpense(true)
        const fd = new FormData(e.currentTarget)
        const res = await createExpense({
            concept: fd.get('concept') as string,
            amount: parseFloat(fd.get('amount') as string),
            category: fd.get('category') as string,
            date: fd.get('date') as string,
            notes: (fd.get('notes') as string) || undefined
        })
        setSavingExpense(false)
        if (res.success) {
            toast.success("Gasto registrado")
            setExpenseDialogOpen(false)
            fetchExpenses()
            fetchAll()
        } else toast.error(res.error)
    }

    async function handleManualPayment(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavingManual(true)
        const fd = new FormData(e.currentTarget)
        const res = await recordManualPayment({
            child_id: fd.get('child_id') as string || '',
            amount: parseFloat(fd.get('amount') as string),
            type: fd.get('type') as string,
            ref_id: fd.get('ref_id') as string || 'manual',
            method: fd.get('method') as string,
            description: fd.get('description') as string,
        })
        setSavingManual(false)
        if (res.success) {
            toast.success("Pago registrado correctamente")
            setManualPaymentOpen(false)
            fetchAll()
            if (activeTab === 'cobros') fetchPaymentGrid()
        } else toast.error(res.error)
    }

    async function handleDeleteExpense(id: string) {
        if (!confirm('¿Eliminar este gasto?')) return
        const res = await deleteExpense(id)
        if (res.success) {
            setExpenses(prev => prev.filter(e => e.id !== id))
            toast.success("Gasto eliminado")
            fetchAll()
        } else toast.error(res.error)
    }

    function exportCSV() {
        let csv = 'Concepto,Tipo,Fecha,Estado,Importe\n'
        transactions.forEach(tx => {
            csv += `"${tx.concept}","${tx.type}","${new Date(tx.date).toLocaleDateString()}","${tx.status}","${tx.amount}"\n`
        })
        // Add expenses
        csv += '\nGASTOS\nConcepto,Categoría,Fecha,Importe\n'
        expenses.forEach(e => {
            csv += `"${e.concept}","${e.category}","${new Date(e.date).toLocaleDateString()}","${e.amount}"\n`
        })
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `finanzas_${selectedMonth}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("CSV exportado")
    }

    const fmt = (n: number) => n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

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
                    <Button onClick={() => setManualPaymentOpen(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md">
                        <Plus className="mr-2 h-4 w-4" /> Registrar Pago
                    </Button>
                    <Button onClick={exportCSV} variant="outline" className="bg-white border-slate-200 shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> CSV
                    </Button>
                </div>
            </div>

            {/* KPI ROW */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <KpiCard label="Ingresos Totales" value={loading ? '...' : `${fmt(kpis?.totalRevenue || 0)}€`}
                    subtitle="Confirmados" color="yellow" icon={<DollarSign className="h-4 w-4" />} />
                <KpiCard label="Pendiente Cobro" value={loading ? '...' : `${fmt(kpis?.pendingPayments || 0)}€`}
                    subtitle="Por cobrar" color="amber" icon={<Wallet className="h-4 w-4" />} />
                <KpiCard label="Alumnos Activos" value={loading ? '...' : String(kpis?.activeStudents || 0)}
                    subtitle="Con membresía" color="blue" icon={<Users className="h-4 w-4" />} />
                <KpiCard label="Gastos" value={loading ? '...' : `${fmt(totalExpenses)}€`}
                    subtitle="Este período" color="red" icon={<FileText className="h-4 w-4" />} />
                <KpiCard label="Beneficio Neto" value={loading ? '...' : `${fmt((kpis?.totalRevenue || 0) - totalExpenses)}€`}
                    subtitle="Ingresos - Gastos" color="green" icon={<TrendingUp className="h-4 w-4" />} />
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
                                                'Torneos': 'bg-yellow-500', 'Tienda': 'bg-purple-500', 'Pagos': 'bg-slate-400'
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground animate-pulse">Cargando...</TableCell></TableRow>
                                    ) : transactions.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No hay movimientos</TableCell></TableRow>
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
                                                <TableCell><Badge className={`${statusCfg.color} border-none font-bold text-[10px] uppercase`}>{statusCfg.label}</Badge></TableCell>
                                                <TableCell className="text-right py-3.5 pr-6">
                                                    <span className={`text-base font-black ${tx.status === 'paid' ? 'text-slate-900' : tx.status === 'pending' ? 'text-amber-600' : 'text-slate-300 line-through'}`}>
                                                        {tx.amount.toLocaleString('es', { minimumFractionDigits: 2 })}€
                                                    </span>
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
                    {/* Month nav + % bar */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateMonth(-1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-lg font-black text-slate-900 capitalize min-w-[180px] text-center">{monthLabel}</span>
                                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateMonth(1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
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
                                {paymentGrid.filter(g => g.status === 'paid').length} de {paymentGrid.length} alumnos han pagado este mes
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
                            {filteredGrid.length === 0 ? (
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
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Importe</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Estado</TableHead>
                                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-6">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGrid.map((row, i) => (
                                            <TableRow key={i} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${row.status === 'paid' ? 'bg-green-50/20' : ''}`}>
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
                                                        {row.paymentMethod === 'efectivo' ? '💵' : row.paymentMethod === 'transferencia' ? '🏦' : '💳'} {row.paymentMethod || 'N/D'}
                                                    </span>
                                                </TableCell>
                                                <TableCell><span className="font-black text-sm text-slate-900">{row.amount}€</span></TableCell>
                                                <TableCell>
                                                    {row.status === 'paid' ? (
                                                        <Badge className="bg-green-100 text-green-700 border-none text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Pagado</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]"><AlertCircle className="h-3 w-3 mr-1" /> Pendiente</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {row.status !== 'paid' ? (
                                                        <Button
                                                            size="sm"
                                                            className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold h-8"
                                                            disabled={markingId === (row.paymentId || row.membershipId)}
                                                            onClick={() => handleMarkPaid(row.paymentId, row.membershipId)}
                                                        >
                                                            {markingId === (row.paymentId || row.membershipId) ? <Loader2 className="h-3 w-3 animate-spin" /> : <>✓ Cobrar</>}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[10px] text-green-500">{row.paidAt ? new Date(row.paidAt).toLocaleDateString() : 'Cobrado'}</span>
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
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="text-lg font-black text-slate-900 capitalize min-w-[180px] text-center">{monthLabel}</span>
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge className="bg-red-100 text-red-700 border-none text-sm px-4 py-1.5">Total: {fmt(totalExpenses)}€</Badge>
                            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={() => setExpenseDialogOpen(true)}>
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
                                                <TableCell className="text-xs text-slate-500">{new Date(exp.date).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-xs text-slate-400 max-w-[200px] truncate">{exp.notes || '—'}</TableCell>
                                                <TableCell className="text-right font-black text-red-600">{exp.amount}€</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteExpense(exp.id)}>
                                                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                                    </Button>
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
                            Registrar Pago Manual
                        </DialogTitle>
                    </div>
                    <form onSubmit={handleManualPayment} className="p-5 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Descripción *</Label>
                            <Input name="description" required placeholder="Ej. Cuota marzo 2026 - Juan García" className="bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Importe (€) *</Label>
                                <Input name="amount" type="number" step="0.01" required placeholder="40.00" className="bg-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Tipo</Label>
                                <select name="type" className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                                    <option value="academy">🎓 Academia</option>
                                    <option value="campus">🏕️ Campus</option>
                                    <option value="tournament">🏆 Torneo</option>
                                    <option value="shop">🛍️ Tienda</option>
                                    <option value="other">📦 Otro</option>
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
                        <input type="hidden" name="child_id" value="" />
                        <input type="hidden" name="ref_id" value="manual" />
                        <div className="pt-3 flex justify-end gap-3 border-t">
                            <Button type="button" variant="ghost" onClick={() => setManualPaymentOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={savingManual} className="bg-black hover:bg-slate-800 text-white font-bold px-6">
                                {savingManual && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Registrar Pago
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ══════════════ DIALOG: Registrar Gasto ══════════════ */}
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl">
                    <div className="bg-red-500 p-5 flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <DialogTitle className="text-lg font-black text-white tracking-tight uppercase">
                            Registrar Gasto
                        </DialogTitle>
                    </div>
                    <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Concepto *</Label>
                            <Input name="concept" required placeholder="Ej. Alquiler campo, Material..." className="bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Importe (€)</Label>
                                <Input name="amount" type="number" step="0.01" required placeholder="150" className="bg-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Fecha</Label>
                                <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="bg-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Categoría</Label>
                            <select name="category" className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
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
                            <Input name="notes" placeholder="Observaciones..." className="bg-white" />
                        </div>
                        <div className="pt-3 flex justify-end gap-3 border-t">
                            <Button type="button" variant="ghost" onClick={() => setExpenseDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={savingExpense} className="bg-black hover:bg-slate-800 text-white font-bold px-6">
                                {savingExpense && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Registrar Gasto
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
