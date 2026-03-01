'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Activity, AlertTriangle, UserCheck, TrendingUp } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from "react"

export function AcademyHealth() {
    const [stats, setStats] = useState({
        pendingPayments: 0,
        newLeads: 0,
        activeStudents: 0
    })
    const supabase = createClient()

    useEffect(() => {
        async function fetchHealth() {
            // Pending Payments
            const { count: pendingCount } = await supabase
                .from('payments')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')

            // New Leads (Last 30 days)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            const { count: leadsCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString())

            // Active Students
            const { count: studentsCount } = await supabase
                .from('children')
                .select('*', { count: 'exact', head: true })

            setStats({
                pendingPayments: pendingCount || 0,
                newLeads: leadsCount || 0,
                activeStudents: studentsCount || 0
            })
        }
        fetchHealth()
    }, [supabase])

    return (
        <Card className="border-none shadow-lg bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Salud de la Academia
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid gap-4">
                {/* Metric 1 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${stats.pendingPayments > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Pagos Pendientes</p>
                            <p className="font-bold text-slate-900">{stats.pendingPayments} facturas</p>
                        </div>
                    </div>
                    {stats.pendingPayments > 0 && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full animate-pulse">
                            Acción req.
                        </span>
                    )}
                </div>

                {/* Metric 2 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Nuevos Leads (30d)</p>
                            <p className="font-bold text-slate-900">{stats.newLeads} interesados</p>
                        </div>
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <UserCheck className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Estudiantes Activos</p>
                            <p className="font-bold text-slate-900">{stats.activeStudents} alumnos</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
