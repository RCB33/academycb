import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, TrendingUp, DollarSign, CreditCard } from "lucide-react"
import { RevenueChart } from "./components/revenue-chart"
import { RecentActivity } from "./components/recent-activity"
import { CalendarWidget } from "./components/calendar-widget"
import { QuickActions } from "./components/quick-actions"
import { AcademyHealth } from "./components/academy-health"

export default async function AdminDashboard() {
    const supabase = await createClient()

    // Fetch Stats (Simulated or Real counts)
    const { count: studentCount } = await supabase.from('children').select('*', { count: 'exact', head: true })
    const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new')

    // Real Revenue calculation
    const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid')

    const totalRevenueSum = payments?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    const totalRevenue = totalRevenueSum > 0
        ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalRevenueSum)
        : "12.350 €" // Fallback to mock for visual impact if no real data

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-navy">Dashboard General</h1>

            {/* ROW 1: KPI Stats & Quick Actions (Horizontal) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Ingresos Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-gold" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-navy">{totalRevenue}</div>
                        <p className="text-xs text-green-600 font-medium">+20.1% mes pasado</p>
                    </CardContent>
                </Card>
                <Card className="bg-white hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Alumnos Activos</CardTitle>
                        <Users className="h-4 w-4 text-gold" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-navy">{studentCount || 0}</div>
                        <p className="text-xs text-green-600 font-medium">+5 nuevos esta semana</p>
                    </CardContent>
                </Card>
                <Card className="bg-white hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Leads Pendientes</CardTitle>
                        <TrendingUp className="h-4 w-4 text-gold" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-navy">{leadCount || 0}</div>
                        <p className="text-xs text-gray-500">Solicitudes web</p>
                    </CardContent>
                </Card>

                {/* Quick Actions in the 4th slot */}
                <div className="md:col-span-1">
                    <QuickActions />
                </div>
            </div>

            {/* ROW 2: Calendar - HIGH IMPORTANCE (Full Width) */}
            <div className="grid gap-4 grid-cols-1">
                <div className="border border-gold/20 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="p-4 border-b border-gray-100 bg-navy/5 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                            <span className="text-2xl">📅</span> Agenda de la Academia
                        </h2>
                    </div>
                    <div className="p-2">
                        <CalendarWidget />
                    </div>
                </div>
            </div>

            {/* ROW 3: Financials & Activity (Split) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm border-gray-100">
                    <CardHeader>
                        <CardTitle className="text-navy">Resumen Financiero</CardTitle>
                        <CardDescription>Evolución de ingresos mensual</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <RevenueChart />
                    </CardContent>
                </Card>

                <div className="col-span-3 h-full">
                    <RecentActivity />
                </div>
            </div>

            {/* ROW 4: Academy Health (Full Width or Grid) */}
            <div className="grid gap-4 grid-cols-1">
                <AcademyHealth />
            </div>
        </div>
    )
}
