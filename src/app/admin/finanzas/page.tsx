'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DollarSign,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    Download,
    Plus,
    Calendar,
    Filter,
    ShoppingBag,
    Wallet
} from "lucide-react"
import { RevenueAreaChart } from "@/components/admin/revenue-area-chart"

export default function FinancePage() {
    const [stats, setStats] = useState({
        totalRevenue: "12,450.00 €",
        pendingPayments: "1,200.00 €",
        monthlyGrowth: "+12.5%",
        activeSubscriptions: "142"
    })

    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchFinanceData() {
            setLoading(true)
            // Fetch Orders from shop as a start
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)

            if (orders) {
                setTransactions(orders)
            } else {
                // Mock transactions if DB is empty
                setTransactions([
                    { id: '1', customer_name: 'Jorge Messi', total_amount: 45.00, status: 'completed', created_at: new Date().toISOString(), type: 'Cuota' },
                    { id: '2', customer_name: 'Mounir Nasraoui', total_amount: 120.00, status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), type: 'Tienda' },
                    { id: '3', customer_name: 'Pablo Páez', total_amount: 45.00, status: 'pending', created_at: new Date(Date.now() - 172800000).toISOString(), type: 'Cuota' },
                    { id: '4', customer_name: 'Fernando González', total_amount: 85.00, status: 'completed', created_at: new Date(Date.now() - 259200000).toISOString(), type: 'Campus' },
                ])
            }
            setLoading(false)
        }
        fetchFinanceData()
    }, [supabase])

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Control Financiero</h1>
                    <p className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Periodo: Febrero 2026
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white border-slate-200 shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Reporte Mensual
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                        <Plus className="mr-2 h-4 w-4" /> Registrar Cobro
                    </Button>
                </div>
            </div>

            {/* KPI ROW */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-lg bg-white overflow-hidden group">
                    <div className="h-1 bg-indigo-500"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Ingresos Totales</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{stats.totalRevenue}</div>
                        <div className="flex items-center gap-1 mt-1 font-bold text-xs text-green-600">
                            <ArrowUpRight className="h-3 w-3" /> {stats.monthlyGrowth}
                            <span className="text-slate-400 font-medium">vs mes anterior</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white overflow-hidden group">
                    <div className="h-1 bg-slate-900"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Pagos Pendientes</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{stats.pendingPayments}</div>
                        <div className="flex items-center gap-1 mt-1 font-bold text-xs text-red-500">
                            <TrendingUp className="h-3 w-3 rotate-180" /> 12 Facturas
                            <span className="text-slate-400 font-medium"> sin cobrar</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white overflow-hidden group">
                    <div className="h-1 bg-indigo-400/50"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Suscripciones</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                            <CreditCard className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{stats.activeSubscriptions}</div>
                        <div className="flex items-center gap-1 mt-1 font-bold text-xs text-indigo-600">
                            +4 nuevas <span className="text-slate-400 font-medium">esta semana</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white overflow-hidden group">
                    <div className="h-1 bg-green-500/50"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Ventas Tienda</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                            <ShoppingBag className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">845,00 €</div>
                        <div className="flex items-center gap-1 mt-1 font-bold text-xs text-green-600">
                            <ArrowUpRight className="h-3 w-3" /> +18.4%
                            <span className="text-slate-400 font-medium">en productos</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CHART SECTION */}
            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-5 border-none shadow-xl bg-white">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-6">
                        <div>
                            <CardTitle className="text-xl font-bold italic tracking-tight underline decoration-indigo-200 underline-offset-4">Rendimiento Mensual</CardTitle>
                            <CardDescription>Evolución de ingresos recurrentes y puntuales</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border">
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold px-3 bg-white shadow-sm hover:bg-white">Ingresos</Button>
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold px-3 text-slate-400">Gastos</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <RevenueAreaChart />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-none shadow-xl bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-[-20px] right-[-20px] h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl"></div>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Estado de Caja</CardTitle>
                        <CardDescription className="text-slate-400">Distribución de capital</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span>Banco (Sabadell)</span>
                                <span>82%</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: '82%' }}></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span>Pasarelas (Stripe)</span>
                                <span>15%</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-green-400" style={{ width: '15%' }}></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span>Efectivo</span>
                                <span>3%</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400" style={{ width: '3%' }}></div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Próxima acción recomendada</p>
                            <div className="bg-indigo-600/20 border border-indigo-500/30 p-4 rounded-xl">
                                <p className="text-xs font-medium text-indigo-300">Hay 3 alumnos con mensualidades vencidas hace más de 5 días.</p>
                                <Button variant="link" className="text-xs text-white p-0 h-auto mt-2 font-black">Notificar a padres por WhatsApp</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* TRANSACTIONS TABLE */}
            <Card className="border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-6">
                    <div>
                        <CardTitle className="text-xl font-bold">Últimos Movimientos</CardTitle>
                        <CardDescription>Listado detallado de transacciones recientes</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="h-9 border-slate-200">
                        <Filter className="mr-2 h-4 w-4" /> Filtros Avanzados
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100 group">
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8">Concepto / Cliente</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Tipo</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Fecha</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Estado</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-8">Importe</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground animate-pulse">Cargando transacciones...</TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => (
                                    <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
                                        <TableCell className="py-4 pl-8">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                    {(tx.customer_name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{tx.customer_name || 'Venta Web'}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Ref: {tx.id.slice(0, 8)}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                                                {tx.type || 'Venta Shop'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-slate-500">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`font-bold text-[10px] uppercase border-none ${tx.status === 'completed' || tx.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                {tx.status === 'completed' || tx.status === 'paid' ? 'Completado' : 'Pendiente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-4 pr-8">
                                            <span className="text-lg font-black text-slate-900">{tx.total_amount || tx.total_price} €</span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
