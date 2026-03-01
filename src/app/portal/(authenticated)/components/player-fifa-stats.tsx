'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Award, Activity } from "lucide-react"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { motion } from "framer-motion"
import { FifaCard } from "@/components/fifa-card"

// Mock data types for now, will receive real props
type Stats = {
    pace: number
    shooting: number
    passing: number
    dribbling: number
    defending: number
    physical: number
    discipline: number
}

export default function PlayerFIFAStats({ stats, history, child }: { stats: Stats, history: any[], child: any }) {
    // Calculate OVR (average of top 6)
    const values = [stats.pace, stats.shooting, stats.passing, stats.dribbling, stats.defending, stats.physical]
    const ovr = Math.round(values.reduce((a, b) => a + b, 0) / values.length)

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
                        <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Análisis Técnico</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <Radar
                                    name="Stats"
                                    dataKey="A"
                                    stroke="#2563eb"
                                    fill="#2563eb"
                                    fillOpacity={0.5}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Evolución OVR</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 99]} hide />
                                <Tooltip />
                                <Line type="monotone" dataKey="ovr" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
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
