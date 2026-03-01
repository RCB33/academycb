"use client"

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from "recharts"

interface PlayerRadarChartProps {
    metrics: {
        pace: number
        shooting: number
        passing: number
        dribbling: number
        defending: number
        physical: number
    }
}

export function PlayerRadarChart({ metrics }: PlayerRadarChartProps) {
    const data = [
        { subject: "Ritmo", A: metrics.pace, fullMark: 100 },
        { subject: "Tiro", A: metrics.shooting, fullMark: 100 },
        { subject: "Pase", A: metrics.passing, fullMark: 100 },
        { subject: "Regate", A: metrics.dribbling, fullMark: 100 },
        { subject: "Defensa", A: metrics.defending, fullMark: 100 },
        { subject: "Físico", A: metrics.physical, fullMark: 100 },
    ]

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                    />
                    <Radar
                        name="Jugador"
                        dataKey="A"
                        stroke="#eab308"
                        fill="#eab308"
                        fillOpacity={0.5}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}
