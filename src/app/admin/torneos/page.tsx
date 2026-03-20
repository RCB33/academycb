'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Plus, Trophy, MapPin, Calendar, Users, Euro, Trash2, UserPlus,
    ChevronLeft, Edit, Loader2, Phone, Mail, ExternalLink, Shield, Zap
} from "lucide-react"
import {
    getTournaments, createTournament, updateTournament, deleteTournament,
    getTournamentTeams, registerTeam, updateTeamStatus, removeTeam, getLocalTeams,
    type Tournament, type TournamentTeam
} from "@/app/actions/tournaments"
import { toast } from "sonner"

const STATUS_CFG: Record<string, { label: string, color: string }> = {
    'draft': { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
    'open': { label: 'Abierto', color: 'bg-green-100 text-green-700' },
    'closed': { label: 'Cerrado', color: 'bg-red-100 text-red-700' },
}

const TEAM_STATUS: Record<string, { label: string, color: string }> = {
    'registered': { label: 'Inscrito', color: 'bg-blue-100 text-blue-700' },
    'confirmed': { label: 'Confirmado', color: 'bg-green-100 text-green-700' },
    'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

export default function TorneosPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<Tournament | null>(null)
    const [teams, setTeams] = useState<TournamentTeam[]>([])
    const [localTeams, setLocalTeams] = useState<any[]>([])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<Tournament | null>(null)
    const [teamDialogOpen, setTeamDialogOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('torneos')

    useEffect(() => { fetchTournaments() }, [])

    async function fetchTournaments() {
        setLoading(true)
        setTournaments(await getTournaments())
        setLoading(false)
    }

    async function selectTournament(t: Tournament) {
        setSelected(t)
        setActiveTab('equipos')
        const [tt, lt] = await Promise.all([getTournamentTeams(t.id), getLocalTeams()])
        setTeams(tt)
        setLocalTeams(lt)
    }

    async function refreshTeams() {
        if (!selected) return
        setTeams(await getTournamentTeams(selected.id))
        fetchTournaments()
    }

    async function handleDeleteTournament(id: string) {
        if (!confirm('¿Eliminar torneo?')) return
        const res = await deleteTournament(id)
        if (res.success) { toast.success("Torneo eliminado"); fetchTournaments(); if (selected?.id === id) { setSelected(null); setActiveTab('torneos') } }
        else toast.error(res.error)
    }

    async function handleTeamStatusChange(id: string, status: string) {
        const res = await updateTeamStatus(id, status)
        if (res.success) { toast.success("Estado actualizado"); refreshTeams() }
        else toast.error(res.error)
    }

    async function handleRemoveTeam(id: string) {
        if (!confirm('¿Eliminar equipo?')) return
        const res = await removeTeam(id)
        if (res.success) { toast.success("Equipo eliminado"); refreshTeams() }
        else toast.error(res.error)
    }

    const openTournaments = tournaments.filter(t => t.status === 'open')
    const totalConfirmed = tournaments.reduce((s, t) => s + (t.confirmed_count || 0), 0)
    const totalTeams = tournaments.reduce((s, t) => s + (t.team_count || 0), 0)
    const estimatedRevenue = tournaments.reduce((s, t) => s + ((t.confirmed_count || 0) * (t.price || 0)), 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        Gestión de Torneos
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">Torneos propios y participaciones externas</p>
                </div>
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black shadow-md font-bold"
                    onClick={() => { setEditing(null); setDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Torneo
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={<Trophy className="h-4 w-4" />} label="Torneos Abiertos" value={openTournaments.length} color="yellow" />
                <KpiCard icon={<Users className="h-4 w-4" />} label="Equipos Confirmados" value={totalConfirmed} color="green" />
                <KpiCard icon={<Shield className="h-4 w-4" />} label="Total Inscritos" value={totalTeams} color="slate" />
                <KpiCard icon={<Euro className="h-4 w-4" />} label="Ingresos Est." value={`${estimatedRevenue.toLocaleString('es')}€`} color="yellow" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-white border shadow-sm p-1 h-auto">
                    <TabsTrigger value="torneos" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        🏆 Torneos
                    </TabsTrigger>
                    <TabsTrigger value="equipos" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg"
                        disabled={!selected}>
                        ⚽ Equipos {selected ? `(${selected.title})` : ''}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="torneos">
                    {loading ? (
                        <div className="text-center py-20 text-muted-foreground animate-pulse">Cargando torneos...</div>
                    ) : tournaments.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200">
                            <CardContent className="py-20 text-center">
                                <Trophy className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-400 mb-2">No hay torneos creados</h3>
                                <p className="text-sm text-slate-400 mb-6">Crea tu primer torneo para empezar a inscribir equipos</p>
                                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                    onClick={() => { setEditing(null); setDialogOpen(true) }}>
                                    <Plus className="mr-2 h-4 w-4" /> Crear Primer Torneo
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tournaments.map(t => (
                                <TournamentCard key={t.id} tournament={t}
                                    onSelect={() => selectTournament(t)}
                                    onEdit={() => { setEditing(t); setDialogOpen(true) }}
                                    onDelete={() => handleDeleteTournament(t.id)} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="equipos">
                    {selected && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <button onClick={() => { setActiveTab('torneos'); setSelected(null) }}
                                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                                    <ChevronLeft className="h-4 w-4" /> Volver a torneos
                                </button>
                                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                    onClick={() => setTeamDialogOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Inscribir Equipo
                                </Button>
                            </div>

                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="h-1.5 bg-yellow-500" />
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-3">
                                            <Trophy className="h-5 w-5 text-yellow-500" />
                                            <div>
                                                <h3 className="font-black text-lg">{selected.title}</h3>
                                                <p className="text-xs text-slate-500">
                                                    {selected.location && `📍 ${selected.location} • `}
                                                    {selected.start_date && `${new Date(selected.start_date).toLocaleDateString('es')} `}
                                                    {selected.end_date && `— ${new Date(selected.end_date).toLocaleDateString('es')}`}
                                                    {selected.price ? ` • ${selected.price}€/equipo` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-yellow-600">{teams.filter(t => t.status !== 'cancelled').length}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Inscritos</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-green-600">{teams.filter(t => t.status === 'confirmed').length}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Confirmados</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-slate-400">{selected.capacity - teams.filter(t => t.status !== 'cancelled').length}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Libres</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {teams.length === 0 ? (
                                <Card className="border-dashed"><CardContent className="py-12 text-center">
                                    <Shield className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-sm text-slate-400">No hay equipos inscritos</p>
                                </CardContent></Card>
                            ) : (
                                <div className="space-y-2">
                                    {teams.map(team => (
                                        <Card key={team.id} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${team.is_local ? 'bg-yellow-500' : 'bg-slate-400'}`}>
                                                        {team.is_local ? <Shield className="h-4 w-4" /> : team.team_name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 flex items-center gap-2">
                                                            {team.team_name}
                                                            {team.is_local && <Badge className="bg-yellow-100 text-yellow-700 border-none text-[9px]">LOCAL</Badge>}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {team.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{team.contact_phone}</span>}
                                                            {team.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{team.contact_email}</span>}
                                                        </div>
                                                    </div>
                                                    <Select value={team.status} onValueChange={(val) => handleTeamStatusChange(team.id, val)}>
                                                        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(TEAM_STATUS).map(([key, conf]) => (
                                                                <SelectItem key={key} value={key}><span className="text-xs font-bold">{conf.label}</span></SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <button onClick={() => handleRemoveTeam(team.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {team.notes && (
                                                    <p className="mt-2 pt-2 border-t border-slate-50 text-xs text-slate-400">{team.notes}</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <TournamentDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); fetchTournaments() } }} tournament={editing} />
            {selected && <RegisterTeamDialog open={teamDialogOpen} onOpenChange={(o) => { setTeamDialogOpen(o); if (!o) refreshTeams() }}
                tournamentId={selected.id} tournamentTitle={selected.title} localTeams={localTeams} />}
        </div>
    )
}

function TournamentCard({ tournament: t, onSelect, onEdit, onDelete }: { tournament: Tournament, onSelect: () => void, onEdit: () => void, onDelete: () => void }) {
    const statusConf = STATUS_CFG[t.status] || STATUS_CFG.draft
    const occupancy = t.capacity > 0 ? Math.round(((t.team_count || 0) / t.capacity) * 100) : 0
    const isPropio = t.type === 'propio'

    return (
        <Card className="border-none shadow-lg hover:shadow-xl transition-all group overflow-hidden cursor-pointer" onClick={onSelect}>
            <div className={`h-1.5 ${isPropio ? 'bg-yellow-500' : 'bg-slate-400'}`} />
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPropio ? 'bg-yellow-50 text-yellow-500' : 'bg-slate-50 text-slate-400'}`}>
                            <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-slate-900">{t.title}</h3>
                            <p className="text-[10px] text-slate-400">{isPropio ? 'Organización propia' : 'Participación externa'}</p>
                        </div>
                    </div>
                    <Badge className={`${statusConf.color} border-none text-[9px] font-bold uppercase tracking-widest`}>{statusConf.label}</Badge>
                </div>

                <div className="space-y-2 text-xs text-slate-500">
                    {t.start_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{new Date(t.start_date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                                {t.end_date && ` — ${new Date(t.end_date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`}</span>
                        </div>
                    )}
                    {t.location && <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-slate-400" /><span>{t.location}</span></div>}
                    {t.external_url && <div className="flex items-center gap-2"><ExternalLink className="h-3 w-3 text-slate-400" /><span className="truncate">{t.external_url}</span></div>}
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-slate-400">Equipos</span>
                        <span className="text-yellow-500">{t.team_count || 0} / {t.capacity}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all bg-yellow-500" style={{
                            width: `${Math.min(occupancy, 100)}%`,
                            backgroundColor: occupancy >= 90 ? '#ef4444' : undefined
                        }} />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    {t.price ? <span className="text-lg font-black text-yellow-500">{t.price}€<span className="text-xs text-slate-400 font-normal">/equipo</span></span>
                        : <span className="text-sm text-slate-300 italic">Gratuito</span>}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit() }}><Edit className="h-3.5 w-3.5 text-slate-400" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete() }}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function TournamentDialog({ open, onOpenChange, tournament }: { open: boolean, onOpenChange: (o: boolean) => void, tournament: Tournament | null }) {
    const [loading, setLoading] = useState(false)
    const isEdit = !!tournament

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        const data = {
            title: fd.get('title') as string,
            start_date: (fd.get('start_date') as string) || null,
            end_date: (fd.get('end_date') as string) || null,
            location: (fd.get('location') as string) || null,
            price: parseFloat(fd.get('price') as string) || 0,
            capacity: parseInt(fd.get('capacity') as string) || 20,
            status: fd.get('status') as string || 'draft',
            type: fd.get('type') as string || 'propio',
            external_url: (fd.get('external_url') as string) || null,
            notes: (fd.get('notes') as string) || null,
        }
        const res = isEdit ? await updateTournament(tournament.id, data as any) : await createTournament(data as any)
        setLoading(false)
        if (res.success) { toast.success(isEdit ? "Torneo actualizado" : "Torneo creado"); onOpenChange(false) }
        else toast.error(res.error)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-lg sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-yellow-500 p-6 flex flex-col items-center">
                    <div className="h-14 w-14 rounded-2xl bg-black/10 backdrop-blur-xl border border-black/10 flex items-center justify-center mb-3">
                        <Trophy className="h-7 w-7 text-black" />
                    </div>
                    <DialogTitle className="text-xl font-black text-black tracking-tight uppercase">
                        {isEdit ? 'Editar Torneo' : 'Nuevo Torneo'}
                    </DialogTitle>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Nombre del Torneo</Label>
                        <Input name="title" defaultValue={tournament?.title} required className="bg-white" placeholder="Ej. Costa Brava Cup 2026" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Tipo</Label>
                            <select name="type" defaultValue={tournament?.type || 'propio'} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                                <option value="propio">🏠 Organización propia</option>
                                <option value="externo">🌍 Participación externa</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Estado</Label>
                            <select name="status" defaultValue={tournament?.status || 'draft'} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                                <option value="draft">Borrador</option>
                                <option value="open">Abierto</option>
                                <option value="closed">Cerrado</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Fecha Inicio</Label>
                            <Input name="start_date" type="date" defaultValue={tournament?.start_date || ''} className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Fecha Fin</Label>
                            <Input name="end_date" type="date" defaultValue={tournament?.end_date || ''} className="bg-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Precio (€/equipo)</Label>
                            <Input name="price" type="number" step="0.01" defaultValue={tournament?.price || ''} placeholder="150" className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Plazas (equipos max.)</Label>
                            <Input name="capacity" type="number" defaultValue={tournament?.capacity || 20} min={1} className="bg-white" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Sede</Label>
                        <Input name="location" defaultValue={tournament?.location || ''} placeholder="Campo Municipal..." className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">URL Externa (opcional)</Label>
                        <Input name="external_url" defaultValue={tournament?.external_url || ''} placeholder="https://..." className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Notas</Label>
                        <Textarea name="notes" defaultValue={tournament?.notes || ''} rows={2} className="bg-white resize-none" />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-black hover:bg-slate-800 text-white font-bold px-6">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEdit ? 'Guardar' : 'Crear Torneo'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function RegisterTeamDialog({ open, onOpenChange, tournamentId, tournamentTitle, localTeams }: {
    open: boolean, onOpenChange: (o: boolean) => void, tournamentId: string, tournamentTitle: string, localTeams: any[]
}) {
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'local' | 'external'>('external')
    const [selectedLocal, setSelectedLocal] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)

        const data: any = {
            tournament_id: tournamentId,
            team_name: mode === 'local' ? (localTeams.find(t => t.id === selectedLocal)?.name || '') : fd.get('team_name') as string,
            contact_phone: (fd.get('contact_phone') as string) || null,
            contact_email: (fd.get('contact_email') as string) || null,
            is_local: mode === 'local',
            team_id: mode === 'local' ? selectedLocal : null,
            notes: (fd.get('notes') as string) || null,
        }

        if (!data.team_name) { toast.error("Nombre de equipo requerido"); setLoading(false); return }

        const res = await registerTeam(data)
        setLoading(false)
        if (res.success) { toast.success("Equipo inscrito"); setSelectedLocal(''); onOpenChange(false) }
        else toast.error(res.error)
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setSelectedLocal(''); setMode('external') } }}>
            <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-yellow-500 p-5 flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                        <UserPlus className="h-6 w-6 text-black" />
                    </div>
                    <DialogTitle className="text-lg font-black text-black tracking-tight uppercase">Inscribir Equipo</DialogTitle>
                    <p className="text-sm font-bold text-black/60 mt-1">{tournamentTitle}</p>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Mode toggle */}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setMode('external')}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'external' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-500'}`}>
                            🌍 Equipo Externo
                        </button>
                        <button type="button" onClick={() => setMode('local')}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'local' ? 'bg-yellow-500 text-black' : 'bg-white border text-slate-500'}`}>
                            🏠 Equipo Propio
                        </button>
                    </div>

                    {mode === 'local' ? (
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Seleccionar Equipo</Label>
                            <div className="max-h-36 overflow-y-auto space-y-1">
                                {localTeams.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-3">No hay equipos en la academia</p>
                                ) : localTeams.map(team => (
                                    <button key={team.id} type="button" onClick={() => setSelectedLocal(team.id)}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all text-sm
                                            ${selectedLocal === team.id ? 'bg-yellow-50 border-2 border-yellow-400' : 'bg-white border border-slate-100 hover:border-yellow-200'}`}>
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedLocal === team.id ? 'bg-yellow-500 text-black' : 'bg-slate-100 text-slate-500'}`}>
                                            <Shield className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-xs">{team.name}</p>
                                            <p className="text-[10px] text-slate-400">{team.category?.name || 'Sin categoría'}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Nombre del Equipo *</Label>
                            <Input name="team_name" placeholder="Ej. CF Barcelona Juvenil A" className="bg-white" />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</Label>
                            <Input name="contact_phone" placeholder="600 123 456" className="bg-white h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                            <Input name="contact_email" type="email" placeholder="club@email.com" className="bg-white h-9 text-sm" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Notas</Label>
                        <Input name="notes" placeholder="Observaciones..." className="bg-white h-9 text-sm" />
                    </div>

                    <div className="pt-3 flex justify-end gap-3 border-t">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading || (mode === 'local' && !selectedLocal)}
                            className="bg-black hover:bg-slate-800 text-white font-bold px-6">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Inscribir
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number | string, color: string }) {
    const cm: Record<string, { bg: string, text: string, icon: string }> = {
        yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'text-yellow-500' },
        green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-500' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-500', icon: 'text-slate-400' },
    }
    const c = cm[color] || cm.slate
    return (
        <Card className="border-none shadow-md bg-white group hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center ${c.icon} group-hover:scale-110 transition-transform`}>{icon}</div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className={`text-2xl font-black ${c.text}`}>{value}</p>
                </div>
            </CardContent>
        </Card>
    )
}
