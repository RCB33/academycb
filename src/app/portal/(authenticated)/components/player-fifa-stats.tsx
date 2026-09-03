'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { FifaCard } from "@/components/fifa-card"
import { PlayerEvolutionChart } from "@/components/admin/player-evolution-chart"

type Stats = {
    pace: number
    shooting: number
    passing: number
    dribbling: number
    defending: number
    physical: number
    discipline: number
}

export default function PlayerFIFAStats({ stats, history, child }: { stats: Stats | null, history: any[], child: any }) {
    if (!stats) return <Card className="overflow-hidden border border-gold/20 bg-white shadow-lg"><CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold"><Activity className="h-7 w-7" /></span><h2 className="mt-5 font-heading text-2xl font-black uppercase text-navy">Primera evaluación pendiente</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">Cuando el equipo técnico registre la primera evaluación aparecerán aquí la tarjeta, el análisis técnico y la evolución real del jugador.</p></CardContent></Card>
    // Calculate OVR (average of top 6)
    const values = [stats.pace, stats.shooting, stats.passing, stats.dribbling, stats.defending, stats.physical]
    const ovr = Math.round(values.reduce((a, b) => a + b, 0) / values.length)

    // Calculate Gamification Level (1 to 10)
    const level = Math.max(1, Math.min(10, Math.floor(ovr / 10)))

    const radarData = [
        { subject: 'S3-PAC', A: stats.pace, fullMark: 99 },
        { subject: 'TIR-SHO', A: stats.shooting, fullMark: 99 },
        { subject: 'PAS-PAS', A: stats.passing, fullMark: 99 },
        { subject: 'REG-DRI', A: stats.dribbling, fullMark: 99 },
        { subject: 'DEF-DEF', A: stats.defending, fullMark: 99 },
        { subject: 'FIS-PHY', A: stats.physical, fullMark: 99 },
    ]

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* FIFA Card visual - Elite/Cyber Style */}
            <FifaCard stats={stats} child={child} ovr={ovr} className="lg:col-span-1" />

            {/* Radar and Line Charts */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" /> Análisis Técnico
                            </div>
                            <div className="rounded-full bg-gold px-3 py-1 text-[10px] font-black uppercase tracking-widest text-navy shadow-sm">
                                Nivel {level}
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <Radar
                                    name="Stats"
                                    dataKey="A"
                            stroke="#D4AF37"
                            fill="#D4AF37"
                                    fillOpacity={0.5}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <PlayerEvolutionChart metricsHistory={history} />
            </div>
        </div>
    )
}

function UserCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
        </svg>
    )
}
