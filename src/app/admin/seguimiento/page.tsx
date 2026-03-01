'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { TrendingUp, Medal, Trophy, Star, ChevronRight, Filter, Download } from "lucide-react"

export default function AdminSeguimientoPage() {
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const { data: children } = await supabase.from('children').select('*, category:categories(name)')

            if (children) {
                const enriched = await Promise.all(children.map(async (child) => {
                    const { data: metrics } = await supabase
                        .from('child_metrics')
                        .select('*')
                        .eq('child_id', child.id)
                        .order('recorded_at', { ascending: false })
                        .limit(1)

                    const lastMetric = metrics?.[0]
                    let ovr = 0
                    if (lastMetric) {
                        const vals = [lastMetric.pace, lastMetric.shooting, lastMetric.passing, lastMetric.dribbling, lastMetric.defending, lastMetric.physical]
                        ovr = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
                    }
                    return { ...child, ovr, last_metric_date: lastMetric?.recorded_at }
                }))
                setStudents(enriched.sort((a, b) => b.ovr - a.ovr)) // Sort by OVR desc
            }
            setLoading(false)
        }
        fetchData()
    }, [supabase])

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Seguimiento Global</h1>
                    <p className="text-muted-foreground font-medium">Ranking de rendimiento basado en métricas oficiales</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white border-slate-200">
                        <Filter className="mr-2 h-4 w-4" /> Filtrar por Categoría
                    </Button>
                    <Button className="bg-slate-900 hover:bg-black text-white">
                        <Download className="mr-2 h-4 w-4" /> Exportar Reporte
                    </Button>
                </div>
            </div>

            {/* TOP 3 CARDS */}
            {!loading && students.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PodiumCard student={students[1]} rank={2} color="bg-slate-300" icon={<Medal className="h-6 w-6 text-slate-500" />} />
                    <PodiumCard student={students[0]} rank={1} color="bg-amber-400" icon={<Trophy className="h-8 w-8 text-amber-900" />} highlight />
                    <PodiumCard student={students[2]} rank={3} color="bg-orange-300" icon={<Medal className="h-6 w-6 text-orange-600" />} />
                </div>
            )}

            <Card className="border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-6">
                    <div>
                        <CardTitle className="text-xl font-bold">Clasificación General</CardTitle>
                        <CardDescription>Puntuación MEDIA (OVR) de todos los jugadores activos</CardDescription>
                    </div>
                    <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100 group">
                                <TableHead className="w-20 text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Pos</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Jugador</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Categoría</TableHead>
                                <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">OVR Actual</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Última Act.</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground animate-pulse">
                                        Calculando ranking de rendimiento...
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student, index) => (
                                    <TableRow
                                        key={student.id}
                                        className="hover:bg-indigo-50/30 transition-colors border-b border-slate-50 cursor-pointer group"
                                        onClick={() => window.location.href = `/admin/crm/alumnos/${student.id}`}
                                    >
                                        <TableCell className="text-center">
                                            <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-black text-xs ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                                    index === 1 ? 'bg-slate-100 text-slate-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'text-slate-400'
                                                }`}>
                                                #{index + 1}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 group-hover:scale-110 transition-transform">
                                                    {student.full_name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-900">{student.full_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-bold text-[10px] border-slate-200 text-slate-600 uppercase">
                                                {student.category?.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-xl font-black ${student.ovr >= 85 ? 'text-green-600' :
                                                        student.ovr >= 75 ? 'text-indigo-600' :
                                                            student.ovr >= 65 ? 'text-amber-600' :
                                                                'text-slate-600'
                                                    }`}>
                                                    {student.ovr > 0 ? student.ovr : '--'}
                                                </span>
                                                {student.ovr > 0 && <TrendingUp className="w-3 h-3 text-green-500" />}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-slate-500">
                                            {student.last_metric_date ? new Date(student.last_metric_date).toLocaleDateString() : 'Pendiente'}
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
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

function PodiumCard({ student, rank, color, icon, highlight = false }: { student: any, rank: number, color: string, icon: React.ReactNode, highlight?: boolean }) {
    if (!student) return null

    return (
        <Card className={`border-none shadow-xl group hover:-translate-y-1 transition-transform overflow-hidden ${highlight ? 'ring-2 ring-amber-400 scale-105 z-10' : ''}`}>
            <CardContent className="p-0">
                <div className={`h-2 ${color}`}></div>
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className="h-20 w-20 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-2xl font-black text-slate-900 group-hover:scale-110 transition-transform">
                            {student.full_name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                            {icon}
                        </div>
                    </div>
                    <div className="mb-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">
                            {student.category?.name}
                        </Badge>
                        <h3 className="font-black text-lg text-slate-900 truncate max-w-[150px]">{student.full_name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-4xl font-black text-slate-900">{student.ovr}</span>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] font-black uppercase text-slate-400">OVR</span>
                            <TrendingUp className="h-3 w-3 text-green-500" />
                        </div>
                    </div>
                    <Link href={`/admin/crm/alumnos/${student.id}`} className="mt-4 w-full">
                        <Button variant="ghost" className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                            Ver Perfil 360
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
