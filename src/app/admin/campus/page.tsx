'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    Plus, Sun, Snowflake, Tent, MapPin, Calendar, Users, Euro,
    Trash2, UserPlus, ChevronLeft, Edit, Loader2, Shirt,
    Phone, AlertTriangle, StickyNote, Zap
} from "lucide-react"
import {
    getCampuses, createCampus, updateCampus, deleteCampus,
    getCampusEnrollments, enrollChild, updateEnrollment, removeEnrollment,
    getAvailableChildrenForCampus,
    type Campus, type CampusEnrollment
} from "@/app/actions/campus"
import { toast } from "sonner"

const TYPE_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    'verano': { label: 'Verano', icon: Sun, color: '#f59e0b' },
    'invierno': { label: 'Invierno', icon: Snowflake, color: '#3b82f6' },
    'tecnificacion': { label: 'Tecnificación', icon: Zap, color: '#8b5cf6' },
    'semana_santa': { label: 'Semana Santa', icon: Tent, color: '#22c55e' },
}

const STATUS_CONFIG: Record<string, { label: string, color: string }> = {
    'draft': { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
    'published': { label: 'Abierto', color: 'bg-green-100 text-green-700' },
    'closed': { label: 'Cerrado', color: 'bg-red-100 text-red-700' },
}

const ENROLLMENT_STATUS: Record<string, { label: string, color: string }> = {
    'reserved': { label: 'Reservado', color: 'bg-blue-100 text-blue-700' },
    'pending_payment': { label: 'Pdte. Pago', color: 'bg-amber-100 text-amber-700' },
    'confirmed': { label: 'Confirmado', color: 'bg-green-100 text-green-700' },
    'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

export default function CampusPage() {
    const [campuses, setCampuses] = useState<Campus[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null)
    const [enrollments, setEnrollments] = useState<CampusEnrollment[]>([])
    const [availableChildren, setAvailableChildren] = useState<any[]>([])
    const [campusDialogOpen, setCampusDialogOpen] = useState(false)
    const [editingCampus, setEditingCampus] = useState<Campus | null>(null)
    const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('ediciones')

    useEffect(() => { fetchCampuses() }, [])

    async function fetchCampuses() {
        setLoading(true)
        const data = await getCampuses()
        setCampuses(data)
        setLoading(false)
    }

    async function selectCampus(campus: Campus) {
        setSelectedCampus(campus)
        setActiveTab('inscripciones')
        const [enr, children] = await Promise.all([
            getCampusEnrollments(campus.id),
            getAvailableChildrenForCampus(campus.id)
        ])
        setEnrollments(enr)
        setAvailableChildren(children)
    }

    async function refreshEnrollments() {
        if (!selectedCampus) return
        const [enr, children] = await Promise.all([
            getCampusEnrollments(selectedCampus.id),
            getAvailableChildrenForCampus(selectedCampus.id)
        ])
        setEnrollments(enr)
        setAvailableChildren(children)
        fetchCampuses()
    }

    function openEditCampus(campus: Campus) {
        setEditingCampus(campus)
        setCampusDialogOpen(true)
    }

    async function handleDeleteCampus(id: string) {
        if (!confirm('¿Seguro que quieres eliminar este campus?')) return
        const res = await deleteCampus(id)
        if (res.success) {
            toast.success("Campus eliminado")
            fetchCampuses()
            if (selectedCampus?.id === id) {
                setSelectedCampus(null)
                setActiveTab('ediciones')
            }
        } else {
            toast.error(res.error)
        }
    }

    async function handleEnrollmentStatusChange(enrollmentId: string, newStatus: string) {
        const res = await updateEnrollment(enrollmentId, { status: newStatus })
        if (res.success) {
            toast.success("Estado actualizado")
            refreshEnrollments()
        } else {
            toast.error(res.error)
        }
    }

    async function handleRemoveEnrollment(enrollmentId: string) {
        if (!confirm('¿Eliminar esta inscripción?')) return
        const res = await removeEnrollment(enrollmentId)
        if (res.success) {
            toast.success("Inscripción eliminada")
            refreshEnrollments()
        } else {
            toast.error(res.error)
        }
    }

    // KPIs
    const publishedCampuses = campuses.filter(c => c.status === 'published')
    const totalConfirmed = campuses.reduce((sum, c) => sum + (c.confirmed_count || 0), 0)
    const totalCapacity = campuses.reduce((sum, c) => sum + c.capacity, 0)
    const totalEnrolled = campuses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)
    const estimatedRevenue = campuses.reduce((sum, c) => sum + ((c.confirmed_count || 0) * (c.price || 0)), 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Tent className="h-8 w-8 text-yellow-500" />
                        Gestión de Campus
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                        Campus de verano, invierno y tecnificación
                    </p>
                </div>
                <Button
                    className="bg-yellow-500 hover:bg-yellow-600 text-black shadow-md font-bold"
                    onClick={() => { setEditingCampus(null); setCampusDialogOpen(true) }}
                >
                    <Plus className="mr-2 h-4 w-4" /> Nueva Edición
                </Button>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={<Tent className="h-4 w-4" />} label="Ediciones Abiertas" value={publishedCampuses.length} color="yellow" />
                <KpiCard icon={<Users className="h-4 w-4" />} label="Confirmados" value={totalConfirmed} color="green" />
                <KpiCard icon={<MapPin className="h-4 w-4" />} label="Plazas Libres" value={totalCapacity - totalEnrolled} color={totalCapacity - totalEnrolled < 5 ? "amber" : "slate"} />
                <KpiCard icon={<Euro className="h-4 w-4" />} label="Ingresos Est." value={`${estimatedRevenue.toLocaleString('es')}€`} color="yellow" />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-white border shadow-sm p-1 h-auto">
                    <TabsTrigger value="ediciones" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        ⛺ Ediciones
                    </TabsTrigger>
                    <TabsTrigger value="inscripciones" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg"
                        disabled={!selectedCampus}
                    >
                        📋 Inscripciones {selectedCampus ? `(${selectedCampus.name})` : ''}
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: Ediciones */}
                <TabsContent value="ediciones">
                    {loading ? (
                        <div className="text-center py-20 text-muted-foreground animate-pulse">Cargando campus...</div>
                    ) : campuses.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200">
                            <CardContent className="py-20 text-center">
                                <Tent className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-400 mb-2">No hay ediciones creadas</h3>
                                <p className="text-sm text-slate-400 mb-6">Crea tu primer campus para empezar a gestionar inscripciones</p>
                                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                    onClick={() => { setEditingCampus(null); setCampusDialogOpen(true) }}>
                                    <Plus className="mr-2 h-4 w-4" /> Crear Primer Campus
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campuses.map(campus => (
                                <CampusCard
                                    key={campus.id}
                                    campus={campus}
                                    onSelect={() => selectCampus(campus)}
                                    onEdit={() => openEditCampus(campus)}
                                    onDelete={() => handleDeleteCampus(campus.id)}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* TAB 2: Inscripciones */}
                <TabsContent value="inscripciones">
                    {selectedCampus && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <button onClick={() => { setActiveTab('ediciones'); setSelectedCampus(null) }}
                                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                                    <ChevronLeft className="h-4 w-4" /> Volver a ediciones
                                </button>
                                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                    onClick={() => setEnrollDialogOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Inscribir Alumno
                                </Button>
                            </div>

                            {/* Campus info bar */}
                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="h-1.5" style={{ backgroundColor: TYPE_CONFIG[selectedCampus.type]?.color || '#eab308' }} />
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const Icon = TYPE_CONFIG[selectedCampus.type]?.icon || Tent
                                                return <Icon className="h-5 w-5" style={{ color: TYPE_CONFIG[selectedCampus.type]?.color }} />
                                            })()}
                                            <div>
                                                <h3 className="font-black text-lg">{selectedCampus.name}</h3>
                                                <p className="text-xs text-slate-500">
                                                    {selectedCampus.location && `📍 ${selectedCampus.location} • `}
                                                    {new Date(selectedCampus.start_date).toLocaleDateString('es')} — {new Date(selectedCampus.end_date).toLocaleDateString('es')}
                                                    {selectedCampus.price && ` • ${selectedCampus.price}€`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-yellow-600">{enrollments.filter(e => e.status !== 'cancelled').length}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Inscritos</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-green-600">{enrollments.filter(e => e.status === 'confirmed').length}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Confirmados</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-slate-400">{selectedCampus.capacity - enrollments.filter(e => e.status !== 'cancelled').length}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Libres</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Enrollments list */}
                            {enrollments.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="py-12 text-center">
                                        <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm text-slate-400">No hay inscripciones aún</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-2">
                                    {enrollments.map(enr => (
                                        <Card key={enr.id} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    {/* Avatar */}
                                                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                                        style={{ backgroundColor: TYPE_CONFIG[selectedCampus.type]?.color || '#eab308' }}>
                                                        {enr.child?.full_name?.charAt(0) || '?'}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900">{enr.child?.full_name || 'Sin nombre'}</p>
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {enr.child?.birth_year && <span>Año {enr.child.birth_year}</span>}
                                                            {enr.child?.category?.name && <span>• {enr.child.category.name}</span>}
                                                            {enr.tshirt_size && <span>• 👕 {enr.tshirt_size}</span>}
                                                            {enr.allergies && <span>• ⚠️ Alergias</span>}
                                                        </div>
                                                    </div>

                                                    {/* Status Selector */}
                                                    <Select value={enr.status} onValueChange={(val) => handleEnrollmentStatusChange(enr.id, val)}>
                                                        <SelectTrigger className="w-[140px] h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(ENROLLMENT_STATUS).map(([key, conf]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    <span className={`text-xs font-bold`}>{conf.label}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {/* Delete */}
                                                    <button onClick={() => handleRemoveEnrollment(enr.id)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                {/* Expandable details */}
                                                {(enr.allergies || enr.emergency_contact || enr.notes) && (
                                                    <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-500">
                                                        {enr.allergies && (
                                                            <div className="flex items-center gap-1.5">
                                                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                                <span>{enr.allergies}</span>
                                                            </div>
                                                        )}
                                                        {enr.emergency_contact && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="h-3 w-3 text-green-500" />
                                                                <span>{enr.emergency_contact} {enr.emergency_phone && `(${enr.emergency_phone})`}</span>
                                                            </div>
                                                        )}
                                                        {enr.notes && (
                                                            <div className="flex items-center gap-1.5">
                                                                <StickyNote className="h-3 w-3 text-blue-500" />
                                                                <span>{enr.notes}</span>
                                                            </div>
                                                        )}
                                                    </div>
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

            {/* Campus Create/Edit Dialog */}
            <CampusDialog
                open={campusDialogOpen}
                onOpenChange={(open) => { setCampusDialogOpen(open); if (!open) { setEditingCampus(null); fetchCampuses() } }}
                campus={editingCampus}
            />

            {/* Enroll Child Dialog */}
            {selectedCampus && (
                <EnrollDialog
                    open={enrollDialogOpen}
                    onOpenChange={(open) => { setEnrollDialogOpen(open); if (!open) refreshEnrollments() }}
                    campusId={selectedCampus.id}
                    campusName={selectedCampus.name}
                    availableChildren={availableChildren}
                />
            )}
        </div>
    )
}

// ─── CAMPUS CARD ───

function CampusCard({ campus, onSelect, onEdit, onDelete }: {
    campus: Campus, onSelect: () => void, onEdit: () => void, onDelete: () => void
}) {
    const typeConf = TYPE_CONFIG[campus.type] || TYPE_CONFIG.verano
    const statusConf = STATUS_CONFIG[campus.status] || STATUS_CONFIG.draft
    const Icon = typeConf.icon
    const occupancy = campus.capacity > 0 ? Math.round(((campus.enrollment_count || 0) / campus.capacity) * 100) : 0

    return (
        <Card className="border-none shadow-lg hover:shadow-xl transition-all group overflow-hidden cursor-pointer" onClick={onSelect}>
            <div className="h-1.5" style={{ backgroundColor: typeConf.color }} />
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${typeConf.color}15` }}>
                            <Icon className="h-5 w-5" style={{ color: typeConf.color }} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-slate-900">{campus.name}</h3>
                            <p className="text-[10px] text-slate-400">{campus.year}</p>
                        </div>
                    </div>
                    <Badge className={`${statusConf.color} border-none text-[9px] font-bold uppercase tracking-widest`}>
                        {statusConf.label}
                    </Badge>
                </div>

                <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{new Date(campus.start_date).toLocaleDateString('es', { day: 'numeric', month: 'short' })} — {new Date(campus.end_date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    {campus.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span>{campus.location}</span>
                        </div>
                    )}
                    {campus.schedule && (
                        <div className="flex items-center gap-2">
                            <Tent className="h-3 w-3 text-slate-400" />
                            <span>{campus.schedule}</span>
                        </div>
                    )}
                </div>

                {/* Occupancy bar */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-slate-400">Ocupación</span>
                        <span style={{ color: typeConf.color }}>{campus.enrollment_count || 0} / {campus.capacity}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                            width: `${Math.min(occupancy, 100)}%`,
                            backgroundColor: occupancy >= 90 ? '#ef4444' : typeConf.color
                        }} />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    {campus.price ? (
                        <span className="text-lg font-black" style={{ color: typeConf.color }}>{campus.price}€</span>
                    ) : (
                        <span className="text-sm text-slate-300 italic">Sin precio</span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit() }}>
                            <Edit className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete() }}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── CAMPUS CREATE/EDIT DIALOG ───

function CampusDialog({ open, onOpenChange, campus }: {
    open: boolean, onOpenChange: (open: boolean) => void, campus: Campus | null
}) {
    const [loading, setLoading] = useState(false)
    const isEdit = !!campus

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)

        const data = {
            name: fd.get('name') as string,
            year: parseInt(fd.get('year') as string) || new Date().getFullYear(),
            type: fd.get('type') as string,
            start_date: fd.get('start_date') as string,
            end_date: fd.get('end_date') as string,
            price: parseFloat(fd.get('price') as string) || null,
            capacity: parseInt(fd.get('capacity') as string) || 30,
            status: fd.get('status') as string || 'draft',
            location: (fd.get('location') as string) || null,
            description: (fd.get('description') as string) || null,
            schedule: (fd.get('schedule') as string) || null,
        }

        const res = isEdit ? await updateCampus(campus.id, data) : await createCampus(data)
        setLoading(false)

        if (res.success) {
            toast.success(isEdit ? "Campus actualizado" : "Campus creado")
            onOpenChange(false)
        } else {
            toast.error(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-lg sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-yellow-500 p-6 flex flex-col items-center">
                    <div className="h-14 w-14 rounded-2xl bg-black/10 backdrop-blur-xl border border-black/10 flex items-center justify-center mb-3">
                        <Tent className="h-7 w-7 text-black" />
                    </div>
                    <DialogTitle className="text-xl font-black text-black tracking-tight uppercase">
                        {isEdit ? 'Editar Campus' : 'Nuevo Campus'}
                    </DialogTitle>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Nombre</Label>
                        <Input name="name" defaultValue={campus?.name} required className="bg-white" placeholder="Ej. Campus Verano 2026 - Turno 1" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Tipo</Label>
                            <select name="type" defaultValue={campus?.type || 'verano'}
                                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background">
                                <option value="verano">☀️ Verano</option>
                                <option value="invierno">❄️ Invierno</option>
                                <option value="tecnificacion">⚡ Tecnificación</option>
                                <option value="semana_santa">🏕️ Semana Santa</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Año</Label>
                            <Input name="year" type="number" defaultValue={campus?.year || new Date().getFullYear()} className="bg-white" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Fecha Inicio</Label>
                            <Input name="start_date" type="date" defaultValue={campus?.start_date} required className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Fecha Fin</Label>
                            <Input name="end_date" type="date" defaultValue={campus?.end_date} required className="bg-white" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Precio (€)</Label>
                            <Input name="price" type="number" step="0.01" defaultValue={campus?.price || ''} placeholder="250" className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Plazas</Label>
                            <Input name="capacity" type="number" defaultValue={campus?.capacity || 30} min={1} className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Estado</Label>
                            <select name="status" defaultValue={campus?.status || 'draft'}
                                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background">
                                <option value="draft">Borrador</option>
                                <option value="published">Abierto</option>
                                <option value="closed">Cerrado</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Sede / Ubicación</Label>
                        <Input name="location" defaultValue={campus?.location || ''} placeholder="Ej. Campo Municipal Palamós" className="bg-white" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Horario</Label>
                        <Input name="schedule" defaultValue={campus?.schedule || ''} placeholder="Ej. 9:00 - 14:00" className="bg-white" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Descripción (opcional)</Label>
                        <Textarea name="description" defaultValue={campus?.description || ''} rows={2} placeholder="Breve descripción del campus..." className="bg-white resize-none" />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-black hover:bg-slate-800 text-white font-bold px-6">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEdit ? 'Guardar' : 'Crear Campus'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ─── ENROLL CHILD DIALOG ───

function EnrollDialog({ open, onOpenChange, campusId, campusName, availableChildren }: {
    open: boolean, onOpenChange: (open: boolean) => void, campusId: string, campusName: string, availableChildren: any[]
}) {
    const [loading, setLoading] = useState(false)
    const [selectedChild, setSelectedChild] = useState<string>('')
    const [search, setSearch] = useState('')
    const [emergencyContact, setEmergencyContact] = useState('')
    const [emergencyPhone, setEmergencyPhone] = useState('')

    const filtered = availableChildren.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase())
    )

    function handleSelectChild(childId: string) {
        setSelectedChild(childId)
        // Auto-fill emergency contact from child's primary guardian
        const child = availableChildren.find(c => c.id === childId)
        if (child?.child_guardians?.length > 0) {
            const guardian = child.child_guardians[0].guardian
            if (guardian) {
                setEmergencyContact(guardian.full_name || '')
                setEmergencyPhone(guardian.phone || '')
            }
        } else {
            setEmergencyContact('')
            setEmergencyPhone('')
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!selectedChild) {
            toast.error("Selecciona un alumno")
            return
        }

        setLoading(true)
        const fd = new FormData(e.currentTarget)

        const res = await enrollChild({
            campus_id: campusId,
            child_id: selectedChild,
            tshirt_size: (fd.get('tshirt_size') as string) || null,
            allergies: (fd.get('allergies') as string) || null,
            emergency_contact: emergencyContact || null,
            emergency_phone: emergencyPhone || null,
            notes: (fd.get('notes') as string) || null,
        })

        setLoading(false)

        if (res.success) {
            toast.success("Alumno inscrito correctamente")
            setSelectedChild('')
            setSearch('')
            setEmergencyContact('')
            setEmergencyPhone('')
            onOpenChange(false)
        } else {
            toast.error(res.error)
        }
    }

    function handleClose() {
        setSelectedChild('')
        setSearch('')
        setEmergencyContact('')
        setEmergencyPhone('')
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) handleClose() }}>
            <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-yellow-500 p-5 flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                        <UserPlus className="h-6 w-6 text-black" />
                    </div>
                    <DialogTitle className="text-lg font-black text-black tracking-tight uppercase">
                        Inscribir Alumno
                    </DialogTitle>
                    <p className="text-sm font-bold text-black/60 mt-1">{campusName}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Search + Select Child */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Alumno *</Label>
                        <Input placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" />
                        <div className="max-h-36 overflow-y-auto space-y-1">
                            {filtered.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-3">No hay alumnos disponibles</p>
                            ) : (
                                filtered.map(child => (
                                    <button
                                        key={child.id}
                                        type="button"
                                        onClick={() => handleSelectChild(child.id)}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all text-sm
                                            ${selectedChild === child.id
                                                ? 'bg-yellow-50 border-2 border-yellow-400'
                                                : 'bg-white border border-slate-100 hover:border-yellow-200'
                                            }`}
                                    >
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold
                                            ${selectedChild === child.id ? 'bg-yellow-500 text-black' : 'bg-slate-100 text-slate-500'}`}>
                                            {child.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-xs">{child.full_name}</p>
                                            <p className="text-[10px] text-slate-400">{child.category?.name || 'Sin cat.'} • {child.birth_year}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Extra fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Shirt className="h-3 w-3" /> Talla
                            </Label>
                            <select name="tshirt_size"
                                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm">
                                <option value="">—</option>
                                <option value="XS">XS</option>
                                <option value="S">S</option>
                                <option value="M">M</option>
                                <option value="L">L</option>
                                <option value="XL">XL</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Tel. Emergencia
                            </Label>
                            <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="600 123 456" className="bg-white h-9 text-sm" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Contacto Emergencia</Label>
                        <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Nombre del contacto" className="bg-white h-9 text-sm" />
                        {emergencyContact && (
                            <p className="text-[10px] text-green-600 font-medium">✓ Auto-completado desde el tutor del alumno</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Alergias / Info Médica
                        </Label>
                        <Input name="allergies" placeholder="Ninguna, celiaco, alergia a..." className="bg-white h-9 text-sm" />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Notas</Label>
                        <Input name="notes" placeholder="Observaciones..." className="bg-white h-9 text-sm" />
                    </div>

                    <div className="pt-3 flex justify-end gap-3 border-t">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading || !selectedChild}
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

// ─── KPI CARD ───

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number | string, color: string }) {
    const colorMap: Record<string, { bg: string, text: string, icon: string }> = {
        yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'text-yellow-500' },
        green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-500' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-500', icon: 'text-slate-400' },
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
