'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DollarSign, TrendingUp, ArrowUpRight, Wallet, Download,
    Calendar, ShoppingBag, GraduationCap, Tent, Trophy, CreditCard, Users
} from "lucide-react"
import { getFinanceKPIs, getFinanceTransactions, type FinanceTransaction, type FinanceKPIs } from "@/app/actions/finance"

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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const [k, t] = await Promise.all([getFinanceKPIs(), getFinanceTransactions()])
            setKpis(k)
            setTransactions(t)
            setLoading(false)
        }
        fetchData()
    }, [])

    const fmt = (n: number) => n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-yellow-500" />
                        Control Financiero
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Datos en tiempo real
                    </p>
                </div>
                <Button variant="outline" className="bg-white border-slate-200 shadow-sm">
                    <Download className="mr-2 h-4 w-4" /> Exportar CSV
                </Button>
            </div>

            {/* KPI ROW */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-lg bg-white overflow-hidden group">
                    <div className="h-1.5 bg-yellow-500" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ingresos Totales</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">
                            {loading ? '...' : `${fmt(kpis?.totalRevenue || 0)}€`}
                        </div>
                        <div className="flex items-center gap-1 mt-1 font-bold text-xs text-green-600">
                            <ArrowUpRight className="h-3 w-3" /> Confirmados
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white overflow-hidden group">
                    <div className="h-1.5 bg-amber-500" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pagos Pendientes</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-600">
                            {loading ? '...' : `${fmt(kpis?.pendingPayments || 0)}€`}
                        </div>
                        <div className="flex items-center gap-1 mt-1 font-bold text-xs text-amber-500">
                            <TrendingUp className="h-3 w-3" /> Por cobrar
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white overflow-hidden group">
                    <div className="h-1.5 bg-blue-500" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alumnos Activos</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                            <Users className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">
                            {loading ? '...' : kpis?.activeStudents || 0}
                        </div>
                        <div className="flex items-center gap-1 mt-1 font-bold text-xs text-blue-500">
                            Con cuota activa
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white overflow-hidden group">
                    <div className="h-1.5 bg-slate-300" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Movimientos</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                            <CreditCard className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">
                            {loading ? '...' : transactions.length}
                        </div>
                        <div className="flex items-center gap-1 mt-1 font-bold text-xs text-slate-400">
                            Transacciones registradas
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* REVENUE BY SOURCE */}
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
                                    <div className="text-center py-10 text-sm text-slate-400">
                                        No hay ingresos registrados aún
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-none shadow-xl bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-[-20px] right-[-20px] h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Resumen Rápido</CardTitle>
                        <CardDescription className="text-slate-400">Estado financiero actual</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span>Cobrado</span>
                                <span className="text-green-400">{loading ? '...' : `${fmt(kpis?.totalRevenue || 0)}€`}</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-green-400 rounded-full" style={{
                                    width: `${kpis && (kpis.totalRevenue + kpis.pendingPayments) > 0 ?
                                        Math.round((kpis.totalRevenue / (kpis.totalRevenue + kpis.pendingPayments)) * 100) : 0}%`
                                }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span>Pendiente</span>
                                <span className="text-amber-400">{loading ? '...' : `${fmt(kpis?.pendingPayments || 0)}€`}</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{
                                    width: `${kpis && (kpis.totalRevenue + kpis.pendingPayments) > 0 ?
                                        Math.round((kpis.pendingPayments / (kpis.totalRevenue + kpis.pendingPayments)) * 100) : 0}%`
                                }} />
                            </div>
                        </div>

                        {kpis && kpis.pendingPayments > 0 && (
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Acción recomendada</p>
                                <div className="bg-amber-600/20 border border-amber-500/30 p-3 rounded-xl">
                                    <p className="text-xs font-medium text-amber-300">
                                        Hay {fmt(kpis.pendingPayments)}€ pendientes de cobro. Revisa los movimientos.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* TRANSACTIONS TABLE */}
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
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground animate-pulse">Cargando movimientos...</TableCell>
                                </TableRow>
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No hay movimientos registrados</TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => {
                                    const typeCfg = TYPE_CFG[tx.type] || TYPE_CFG.pago
                                    const statusCfg = STATUS_CFG[tx.status] || STATUS_CFG.pending
                                    return (
                                        <TableRow key={`${tx.type}-${tx.id}`} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
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
                                            <TableCell>
                                                <Badge className={`${typeCfg.color} border-none font-bold text-[10px] uppercase`}>
                                                    {typeCfg.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-500">
                                                {new Date(tx.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusCfg.color} border-none font-bold text-[10px] uppercase`}>
                                                    {statusCfg.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right py-3.5 pr-6">
                                                <span className={`text-base font-black ${tx.status === 'paid' ? 'text-slate-900' : tx.status === 'pending' ? 'text-amber-600' : 'text-slate-300 line-through'}`}>
                                                    {tx.amount.toLocaleString('es', { minimumFractionDigits: 2 })}€
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
