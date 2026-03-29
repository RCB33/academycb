'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { TrendingUp, Activity } from "lucide-react"

export function PlayerEvolutionChart({ metricsHistory }: { metricsHistory: any[] }) {
    if (!metricsHistory || metricsHistory.length <= 1) {
        return (
            <Card className="border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-900 text-white">
                    <CardTitle className="text-lg font-bold">Evolución del Jugador</CardTitle>
                    <CardDescription className="text-slate-400">Progreso histórico del OVR medio</CardDescription>
                </CardHeader>
                <CardContent className="p-8 flex items-center justify-center h-48 italic text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center gap-2">
                        <TrendingUp className="h-8 w-8 opacity-20" />
                        <p className="text-sm text-center">No hay suficientes datos históricos.<br/>Se necesitan al menos 2 periodos de evaluación.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Process data to calculate OVR and format date
    const data = [...metricsHistory].reverse().map(m => {
        const ovr = Math.round((m.pace + m.shooting + m.passing + m.dribbling + m.defending + m.physical) / 6)
        return {
            date: new Date(m.recorded_at).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
            ovr,
            pace: m.pace,
            shooting: m.shooting,
            passing: m.passing,
            dribbling: m.dribbling,
            defending: m.defending,
            physical: m.physical
        }
    })

    return (
        <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-yellow-500" />
                    Evolución Histórica
                </CardTitle>
                <CardDescription className="text-slate-400">Progresión gráfica del perfil deportivo a lo largo de la temporada</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 h-[350px] bg-slate-50/30">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                        <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} tickCount={6} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                            labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        
                        {/* OVR is the main thick line */}
                        <Line type="monotone" name="Media (OVR)" dataKey="ovr" stroke="#1e293b" strokeWidth={4} dot={{ r: 4, fill: '#1e293b', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
                        
                        {/* Individual attribute lines (secondary) */}
                        <Line type="monotone" name="Ritmo" dataKey="pace" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" name="Tiro" dataKey="shooting" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" name="Pase" dataKey="passing" stroke="#64748b" strokeWidth={2} dot={false} />
                        <Line type="monotone" name="Regate" dataKey="dribbling" stroke="#eab308" strokeWidth={2} dot={false} />
                        <Line type="monotone" name="Defensa" dataKey="defending" stroke="#22c55e" strokeWidth={2} dot={false} />
                        <Line type="monotone" name="Físico" dataKey="physical" stroke="#f97316" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
