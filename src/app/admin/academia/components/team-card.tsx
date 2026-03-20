"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Clock, Edit2, Trash2, Shield } from "lucide-react"
import { deleteTeam } from "@/app/actions/teams"
import { toast } from "sonner"

interface TeamCardProps {
    team: any
    onEdit: (team: any) => void
}

export function TeamCard({ team, onEdit }: TeamCardProps) {
    const playerCount = team.players?.length || 0
    const maxPlayers = team.max_players || 16
    const fillPercentage = Math.round((playerCount / maxPlayers) * 100)

    async function handleDelete() {
        if (!confirm(`¿Eliminar el equipo "${team.name}"? Los jugadores asignados quedarán sin equipo.`)) return

        const res = await deleteTeam(team.id)
        if (res.success) {
            toast.success("Equipo eliminado")
        } else {
            toast.error(res.error)
        }
    }

    return (
        <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white hover:-translate-y-1">
            {/* Color bar top */}
            <div className="h-2" style={{ backgroundColor: team.color || '#3b82f6' }} />
            <CardContent className="p-0">
                <div className="p-5 space-y-4">
                    {/* Header: name + badge */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md"
                                style={{ backgroundColor: `${team.color}15` }}
                            >
                                <Shield className="h-6 w-6" style={{ color: team.color }} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-lg tracking-tight">{team.name}</h3>
                                {team.category && (
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest border-slate-200 text-slate-500">
                                        {team.category.name}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Badge className={`text-[10px] uppercase font-bold border-none ${team.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {team.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                    </div>

                    {/* Coach */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        {team.coach ? (
                            <>
                                <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                    <AvatarImage src={team.coach.avatar_url || ""} />
                                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-bold">
                                        {team.coach.full_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">{team.coach.full_name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Entrenador</p>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-slate-400 italic">Sin entrenador asignado</p>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="font-black text-slate-900">{playerCount}</span>
                            <span className="text-slate-400 text-xs">/ {maxPlayers}</span>
                        </div>
                        {team.schedule && (
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-medium text-slate-600 truncate">{team.schedule}</span>
                            </div>
                        )}
                    </div>

                    {/* Capacity bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Plantilla</span>
                            <span>{fillPercentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${fillPercentage}%`,
                                    backgroundColor: fillPercentage > 90 ? '#ef4444' : fillPercentage > 70 ? '#f97316' : team.color || '#3b82f6'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions footer */}
                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-indigo-600 hover:bg-indigo-50" onClick={() => onEdit(team)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs font-bold text-red-500 hover:bg-red-50" onClick={handleDelete}>
                        <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
