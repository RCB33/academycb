"use client"

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"

const data = [
    { name: "Sep", total: 4500 },
    { name: "Oct", total: 5200 },
    { name: "Nov", total: 4800 },
    { name: "Dic", total: 6100 },
    { name: "Ene", total: 5900 },
    { name: "Feb", total: 7200 },
]

export function RevenueAreaChart() {
    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        dx={-10}
                        tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
