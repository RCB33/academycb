'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Plus, Shield, Users, Calendar, UserMinus, UserPlus, ExternalLink } from "lucide-react"
import { TeamCard } from "./components/team-card"
import { TeamDialog } from "./components/team-dialog"
import { getTeams, getUnassignedPlayers, assignPlayerToTeam } from "@/app/actions/teams"
import { toast } from "sonner"

export default function AcademyPage() {
    const [teams, setTeams] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [workers, setWorkers] = useState<any[]>([])
    const [unassigned, setUnassigned] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editTeam, setEditTeam] = useState<any | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    // Assignment modal state
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [playerToAssign, setPlayerToAssign] = useState<any | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        fetchAll()
    }, [])

    async function fetchAll() {
        setLoading(true)
        const [teamsData, { data: cats }, { data: wrks }, unassignedData] = await Promise.all([
            getTeams(),
            supabase.from('categories').select('*').order('name'),
            supabase.from('workers').select('*').order('full_name'),
            getUnassignedPlayers()
        ])
        setTeams(teamsData)
        setCategories(cats || [])
        setWorkers(wrks || [])
        setUnassigned(unassignedData)
        setLoading(false)
    }

    function handleEdit(team: any) {
        setEditTeam(team)
        setEditOpen(true)
    }

    function handleDialogClose(open: boolean) {
        setEditOpen(open)
        if (!open) {
            setEditTeam(null)
            fetchAll()
        }
    }

    function openAssignModal(player: any) {
        setPlayerToAssign(player)
        setAssignModalOpen(true)
    }

    async function handleAssign(childId: string, teamId: string) {
        const res = await assignPlayerToTeam(childId, teamId)
        if (res.success) {
            toast.success("Jugador asignado")
            setAssignModalOpen(false)
            setPlayerToAssign(null)
            fetchAll()
        } else {
            toast.error(res.error)
        }
    }

    async function handleUnassign(childId: string) {
        const res = await assignPlayerToTeam(childId, null)
        if (res.success) {
            toast.success("Jugador desasignado")
            fetchAll()
        } else {
            toast.error(res.error)
        }
    }

    const activeTeams = teams.filter(t => t.status === 'active')
    const totalPlayers = teams.reduce((sum, t) => sum + (t.players?.length || 0), 0)

    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Shield className="h-8 w-8 text-yellow-500" />
                        Gestión de Academia
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        Equipos, plantillas y horarios de entrenamiento
                    </p>
                </div>
                <TeamDialog
                    mode="create"
                    categories={categories}
                    workers={workers}
                    trigger={
                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black shadow-md font-bold">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Equipo
                        </Button>
                    }
                    onOpenChange={(open) => { if (!open) fetchAll() }}
                />
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={<Shield className="h-4 w-4" />} label="Equipos Activos" value={activeTeams.length} color="yellow" />
                <KpiCard icon={<Users className="h-4 w-4" />} label="Jugadores Asignados" value={totalPlayers} color="green" />
                <KpiCard icon={<UserMinus className="h-4 w-4" />} label="Sin Asignar" value={unassigned.length} color={unassigned.length > 0 ? "amber" : "slate"} />
                <KpiCard icon={<Calendar className="h-4 w-4" />} label="Entrenadores" value={new Set(teams.filter(t => t.coach_id).map(t => t.coach_id)).size} color="yellow" />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="equipos" className="space-y-4">
                <TabsList className="bg-white border shadow-sm p-1 h-auto">
                    <TabsTrigger value="equipos" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        🏟️ Equipos
                    </TabsTrigger>
                    <TabsTrigger value="plantillas" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        👥 Plantillas
                    </TabsTrigger>
                    <TabsTrigger value="horarios" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        📅 Horarios
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: Equipos */}
                <TabsContent value="equipos">
                    {loading ? (
                        <div className="text-center py-20 text-muted-foreground animate-pulse">Cargando equipos...</div>
                    ) : teams.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200">
                            <CardContent className="py-20 text-center">
                                <Shield className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-400 mb-2">No hay equipos creados</h3>
                                <p className="text-sm text-slate-400 mb-6">Empieza creando tu primer equipo para organizar la academia</p>
                                <TeamDialog
                                    mode="create"
                                    categories={categories}
                                    workers={workers}
                                    trigger={
                                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                                            <Plus className="mr-2 h-4 w-4" /> Crear Primer Equipo
                                        </Button>
                                    }
                                    onOpenChange={(open) => { if (!open) fetchAll() }}
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.map(team => (
                                <TeamCard key={team.id} team={team} onEdit={handleEdit} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* TAB 2: Plantillas */}
                <TabsContent value="plantillas">
                    <div className="space-y-6">
                        {/* Unassigned players */}
                        {unassigned.length > 0 && (
                            <Card className="border-amber-200 bg-amber-50/30 shadow-md">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-700">
                                        <UserMinus className="h-4 w-4" />
                                        Jugadores sin Equipo ({unassigned.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {unassigned.map(player => (
                                            <div key={player.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-amber-200 shadow-sm hover:shadow-md transition-all">
                                                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                                                    {player.full_name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <button
                                                        onClick={() => router.push(`/admin/crm/alumnos/${player.id}`)}
                                                        className="text-xs font-bold text-slate-700 hover:text-yellow-600 transition-colors text-left"
                                                    >
                                                        {player.full_name}
                                                    </button>
                                                    {player.category && (
                                                        <span className="text-[9px] text-slate-400 font-medium">{player.category.name}</span>
                                                    )}
                                                </div>
                                                {activeTeams.length > 0 && (
                                                    <button
                                                        onClick={() => openAssignModal(player)}
                                                        className="ml-1 h-7 w-7 rounded-lg bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center transition-all hover:scale-110 shadow-sm"
                                                        title="Asignar a equipo"
                                                    >
                                                        <UserPlus className="h-3.5 w-3.5 text-black" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Teams with players */}
                        {teams.map(team => (
                            <Card key={team.id} className="border-none shadow-lg overflow-hidden">
                                <div className="h-1.5" style={{ backgroundColor: team.color }} />
                                <CardHeader className="flex flex-row items-center justify-between py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${team.color}15` }}>
                                            <Shield className="h-5 w-5" style={{ color: team.color }} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-black">{team.name}</CardTitle>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                {team.category && <span>{team.category.name}</span>}
                                                {team.coach && <span>• {team.coach.full_name}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className="text-xs font-bold" style={{ backgroundColor: `${team.color}15`, color: team.color, border: 'none' }}>
                                        {team.players?.length || 0} / {team.max_players}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    {(!team.players || team.players.length === 0) ? (
                                        <p className="text-xs text-slate-400 italic text-center py-4">No hay jugadores asignados a este equipo</p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {team.players.map((player: any) => (
                                                <div key={player.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 group hover:bg-slate-100 transition-colors">
                                                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: team.color }}>
                                                        {player.full_name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <button
                                                            onClick={() => router.push(`/admin/crm/alumnos/${player.id}`)}
                                                            className="text-xs font-bold text-slate-700 truncate block hover:text-yellow-600 transition-colors text-left"
                                                        >
                                                            {player.full_name}
                                                        </button>
                                                        <span className="text-[10px] text-slate-400">{player.birth_year}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnassign(player.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                                                        title="Quitar del equipo"
                                                    >
                                                        <UserMinus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* TAB 3: Horarios */}
                <TabsContent value="horarios">
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-yellow-500" />
                                Parrilla Semanal de Entrenamientos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-48">Equipo</th>
                                            {DAYS.map(day => (
                                                <th key={day} className="text-center py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teams.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                                                    No hay equipos para mostrar horarios
                                                </td>
                                            </tr>
                                        ) : (
                                            teams.map(team => {
                                                const scheduleDays = parseSchedule(team.schedule)
                                                return (
                                                    <tr key={team.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                                                                <span className="text-xs font-bold text-slate-800">{team.name}</span>
                                                            </div>
                                                        </td>
                                                        {DAYS.map(day => (
                                                            <td key={day} className="text-center py-3 px-3">
                                                                {scheduleDays[day] ? (
                                                                    <div
                                                                        className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold"
                                                                        style={{ backgroundColor: `${team.color}15`, color: team.color }}
                                                                    >
                                                                        {scheduleDays[day]}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-200">—</span>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Dialog */}
            {editTeam && (
                <TeamDialog
                    mode="edit"
                    team={editTeam}
                    categories={categories}
                    workers={workers}
                    open={editOpen}
                    onOpenChange={handleDialogClose}
                />
            )}

            {/* Assignment Modal */}
            <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl">
                    <div className="bg-yellow-500 p-5 flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                            <UserPlus className="h-6 w-6 text-black" />
                        </div>
                        <DialogTitle className="text-lg font-black text-black tracking-tight uppercase">
                            Asignar a Equipo
                        </DialogTitle>
                        {playerToAssign && (
                            <p className="text-sm font-bold text-black/60 mt-1">{playerToAssign.full_name}</p>
                        )}
                    </div>
                    <div className="p-5 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Selecciona un equipo</p>
                        {activeTeams.map(team => (
                            <button
                                key={team.id}
                                onClick={() => playerToAssign && handleAssign(playerToAssign.id, team.id)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-yellow-300 hover:bg-yellow-50 transition-all group"
                            >
                                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${team.color}15` }}>
                                    <Shield className="h-5 w-5" style={{ color: team.color }} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-bold text-slate-900">{team.name}</p>
                                    <p className="text-[10px] text-slate-400">
                                        {team.category?.name || 'Sin categoría'} • {team.players?.length || 0}/{team.max_players} jugadores
                                    </p>
                                </div>
                                <div className="h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-yellow-500 flex items-center justify-center transition-all">
                                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-black transition-colors" />
                                </div>
                            </button>
                        ))}
                        {activeTeams.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No hay equipos activos. Crea uno primero.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Helper components
function KpiCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
    const colorMap: Record<string, { bg: string, text: string, icon: string }> = {
        yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'text-yellow-500' },
        green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-500' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'text-slate-400' },
    }
    const c = colorMap[color] || colorMap.slate

    return (
        <Card className="border-none shadow-md bg-white group hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center ${c.icon} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className={`text-2xl font-black ${c.text}`}>{value}</p>
                </div>
            </CardContent>
        </Card>
    )
}

// Parses schedule strings like "L,X 17:00-18:30" into a day map
function parseSchedule(schedule: string | null): Record<string, string> {
    if (!schedule) return {}

    const result: Record<string, string> = {}
    const dayAbbrevs: Record<string, string> = {
        'L': 'Lunes', 'M': 'Martes', 'X': 'Miércoles', 'J': 'Jueves', 'V': 'Viernes', 'S': 'Sábado',
        'LU': 'Lunes', 'MA': 'Martes', 'MI': 'Miércoles', 'JU': 'Jueves', 'VI': 'Viernes', 'SA': 'Sábado',
    }

    // Try to parse "L,X 17:00-18:30" or "L,X,V 17:00"
    const timeMatch = schedule.match(/(\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?)/)
    const time = timeMatch ? timeMatch[1] : schedule

    // Extract day references from the start of the string
    const dayPart = schedule.replace(time, '').trim().replace(/[,\s]+$/, '')

    // Check for range like L-X
    const rangeMatch = dayPart.match(/^([LMXJVS])\s*-\s*([LMXJVS])$/i)
    if (rangeMatch) {
        const dayOrder = ['L', 'M', 'X', 'J', 'V', 'S']
        const start = dayOrder.indexOf(rangeMatch[1].toUpperCase())
        const end = dayOrder.indexOf(rangeMatch[2].toUpperCase())
        if (start >= 0 && end >= 0) {
            for (let i = start; i <= end; i++) {
                const fullDay = dayAbbrevs[dayOrder[i]]
                if (fullDay) result[fullDay] = time
            }
            return result
        }
    }

    // Check for comma-separated days like L,X,V
    const dayList = dayPart.split(/[,\s]+/).filter(Boolean)
    for (const d of dayList) {
        const upper = d.toUpperCase()
        const fullDay = dayAbbrevs[upper]
        if (fullDay) result[fullDay] = time
    }

    // If nothing matched, put on all days (fallback)
    if (Object.keys(result).length === 0 && schedule.trim()) {
        result['Lunes'] = schedule
    }

    return result
}
