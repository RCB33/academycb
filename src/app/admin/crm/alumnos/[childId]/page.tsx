'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, CreditCard, ShoppingBag, Trophy, Activity, Wallet, FileText, TrendingUp, ChevronRight, MessageSquare, Upload, Loader2, Trash2, Pencil, X, Star, UserMinus } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlayerRadarChart } from "@/components/admin/player-radar-chart"
import { PlayerEvolutionChart } from "@/components/admin/player-evolution-chart"
import { DocumentUploader } from "@/components/admin/document-uploader"
import { getStudentDocuments } from "@/app/actions/documents"
import { updateStudentMetrics } from "@/app/actions/metrics"
import { uploadStudentAvatar, updateStudentData, unlinkGuardian } from "@/app/actions/students"
import { toggleAchievement } from "@/app/actions/gamification"
import { getCoachNotes, createCoachNote, deleteCoachNote, updateCoachNote } from "@/app/actions/notes"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FifaCard } from "@/components/fifa-card"
import { EditStudentDialog } from "@/components/admin/edit-student-dialog"
import { PaymentsList } from "@/components/admin/payments-list"
import { getStudentPayments } from "@/app/actions/payments"
import { ManageAchievementsDialog } from "@/components/admin/manage-achievements-dialog"
import { LinkGuardianDialog } from "@/components/admin/link-guardian-dialog"
import { ReportDownloadButton } from "@/components/admin/report-download-button"
import { getGuardiansSignatures } from "@/app/actions/signatures"
import { ShieldCheck } from "lucide-react"

export default function StudentProfilePage({ params }: { params: Promise<{ childId: string }> }) {
    const { childId } = use(params)
    const [student, setStudent] = useState<any>(null)
    const [metrics, setMetrics] = useState<any>(null)
    const [metricsHistory, setMetricsHistory] = useState<any[]>([])
    const [tempMetrics, setTempMetrics] = useState<any>(null)
    const [isEditingMetrics, setIsEditingMetrics] = useState(false)
    const [documents, setDocuments] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [achievements, setAchievements] = useState<any[]>([])
    const [paymentsData, setPaymentsData] = useState<{ memberships: any[], payments: any[] }>({ memberships: [], payments: [] })
    const [plans, setPlans] = useState<any[]>([])
    const [studentAchievements, setStudentAchievements] = useState<any[]>([])
    const [signatures, setSignatures] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSavingMetrics, setIsSavingMetrics] = useState(false)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const [coachNotes, setCoachNotes] = useState<any[]>([])
    const [noteForm, setNoteForm] = useState({ title: '', content: '' })
    const [isSavingNote, setIsSavingNote] = useState(false)
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
    const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchStudentData()
    }, [])

    async function fetchStudentData() {
        setLoading(true)

        // Fetch Student Base Data
        let studentData: any = null

        const { data } = await supabase
            .from('children')
            .select(`*, category:categories(name), guardians:child_guardians(relationship, is_primary, guardian:guardians(*))`)
            .eq('id', childId)
            .single()
        studentData = data

        if (studentData) {
            setStudent(studentData)

            // Fetch Coach Notes
            const cNotes = await getCoachNotes(childId)
            setCoachNotes(cNotes || [])

            // 1. Fetch Metrics (All history)
            const { data: metricsData } = await supabase
                .from('child_metrics')
                .select('*')
                .eq('child_id', childId)
                .order('recorded_at', { ascending: false })

            if (metricsData && metricsData.length > 0) {
                setMetrics(metricsData[0])
                setTempMetrics(metricsData[0])
                setMetricsHistory(metricsData)
            } else {
                const defaultMetrics = { pace: 85, shooting: 92, passing: 91, dribbling: 95, defending: 45, physical: 70 }
                setMetrics(defaultMetrics)
                setTempMetrics(defaultMetrics)
                setMetricsHistory([])
            }

            // 2. Fetch Documents
            const docs = await getStudentDocuments(childId)
            setDocuments(docs)

            // 3. Fetch Achievements
            const { data: allAch } = await supabase.from('achievements').select('*').order('name')
            const { data: childAch } = await supabase.from('child_achievements').select('*').eq('child_id', childId)

            setAchievements(allAch || [])
            setStudentAchievements(childAch || [])

            // 4. Fetch Categories
            const { data: cats } = await supabase.from('categories').select('*').order('name')
            setCategories(cats || [])

            // 5. Fetch Payments & Plans
            const studentPaymentsData = await getStudentPayments(childId)
            setPaymentsData(studentPaymentsData)

            const { data: allPlans } = await supabase.from('membership_plans').select('*')
            setPlans(allPlans || [])

            // 6. Fetch Signatures
            if (studentData.guardians && studentData.guardians.length > 0) {
                const guardianIds = studentData.guardians.map((g: any) => g.guardian.id)
                const sigs = await getGuardiansSignatures(guardianIds)
                setSignatures(sigs)
            }
        }

        setLoading(false)
    }

    async function handleSaveMetrics() {
        setIsSavingMetrics(true)
        const result = await updateStudentMetrics(childId, {
            pace: tempMetrics.pace,
            shooting: tempMetrics.shooting,
            passing: tempMetrics.passing,
            dribbling: tempMetrics.dribbling,
            defending: tempMetrics.defending,
            physical: tempMetrics.physical
        })

        if (result.success) {
            setMetrics(tempMetrics)
            setIsEditingMetrics(false)
            toast.success("Métricas actualizadas")
        } else {
            alert("Error al actualizar métricas")
        }
        setIsSavingMetrics(false)
    }

    const handleWhatsAppContact = () => {
        if (!primaryGuardian) return
        const message = `Hola ${primaryGuardian.full_name}, te escribo desde la Academy Costa Brava en relación al progreso de ${student.full_name}. ¿Podríamos hablar un momento?`
        const url = `https://wa.me/${primaryGuardian.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingAvatar(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('childId', childId)

        const result = await uploadStudentAvatar(formData)
        if (result.success) {
            setStudent({ ...student, avatar_url: result.url })
            toast.success("Foto actualizada")
        } else {
            alert("Error al subir foto")
        }
        setIsUploadingAvatar(false)
    }

    async function handleToggleAchievement(achievementId: string) {
        await toggleAchievement(childId, achievementId)
        fetchStudentData()
    }

    async function handleAddNote() {
        if (!noteForm.content.trim()) return
        setIsSavingNote(true)

        let result
        if (editingNoteId) {
            result = await updateCoachNote(editingNoteId, childId, {
                title: noteForm.title || 'Observación',
                content: noteForm.content
            })
        } else {
            result = await createCoachNote(childId, {
                title: noteForm.title || 'Observación',
                content: noteForm.content,
                note_date: new Date().toISOString().split('T')[0]
            })
        }

        if (result.success) {
            toast.success(editingNoteId ? "Nota actualizada" : "Nota añadida")
            setNoteForm({ title: '', content: '' })
            setEditingNoteId(null)
            const cNotes = await getCoachNotes(childId)
            setCoachNotes(cNotes || [])
        } else {
            toast.error("Error al guardar nota")
        }
        setIsSavingNote(false)
    }

    function handleEditNote(note: any) {
        setNoteForm({ title: note.title, content: note.content })
        setEditingNoteId(note.id)
        // Scroll to form? Maybe not needed if close.
    }

    function handleCancelEdit() {
        setNoteForm({ title: '', content: '' })
        setEditingNoteId(null)
    }



    async function confirmDeleteNote() {
        if (!deletingNoteId) return
        await deleteCoachNote(deletingNoteId, childId)
        const cNotes = await getCoachNotes(childId)
        setCoachNotes(cNotes || [])
        toast.success("Nota eliminada")
        setDeletingNoteId(null)
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="h-12 w-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-medium">Cargando perfil 360º...</p>
        </div>
    )

    if (!student) return <div className="p-8 text-center text-red-500 font-bold">Alumno no encontrado</div>

    const primaryGuardian = student.guardians?.find((g: any) => g.is_primary)?.guardian
    const ovr = metrics ? Math.round((metrics.pace + metrics.shooting + metrics.passing + metrics.dribbling + metrics.defending + metrics.physical) / 6) : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/crm/alumnos">
                        <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white shadow-sm border">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">{student.full_name}</h1>
                            <Badge className="bg-slate-900 hover:bg-slate-800 text-white border-none px-3 py-1">{student.category?.name || '---'}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm flex items-center gap-2">
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">ID: {student.id.slice(0, 8)}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>{student.birth_date ? new Date(student.birth_date).toLocaleDateString() : `Nacido en ${student.birth_year}`}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <EditStudentDialog
                        student={student}
                        guardian={primaryGuardian}
                        categories={categories}
                        onUpdate={fetchStudentData}
                    />
                    <ReportDownloadButton
                        student={student}
                        metrics={metrics}
                        attendanceStats={{ total: 20, present: 18, percentage: "90" }} // Placeholder until attendance is calculated fully
                        coachNotes={coachNotes.length > 0 ? coachNotes[0].content : "Sin observaciones recientes."}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar - Key Stats */}
                <div className="space-y-6">
                    {/* FIFA Card Integration */}
                    {metrics ? (
                        <div className="flex flex-col items-center mb-6 gap-4">
                            <FifaCard
                                stats={metrics}
                                child={student}
                                ovr={ovr}
                                className="transform hover:scale-105 transition-transform duration-300"
                            />

                            {/* Avatar Upload Button */}
                            <div className="relative">
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                    accept="image/*"
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className={`flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold cursor-pointer hover:bg-slate-800 transition-colors shadow-lg ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    {isUploadingAvatar ? 'Subiendo...' : 'Cambiar Foto'}
                                </label>
                            </div>
                        </div>
                    ) : (
                        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-slate-900 to-black text-white min-h-[400px] flex items-center justify-center">
                            <div className="text-center p-6">
                                <Loader2 className="h-8 w-8 text-yellow-500 animate-spin mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-200">Cargando carta...</p>
                            </div>
                        </Card>
                    )}

                    <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-700" /> Tutores / Acceso
                            </CardTitle>
                            <LinkGuardianDialog childId={childId} onUpdate={fetchStudentData} />
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-sm">
                            {student.guardians && student.guardians.length > 0 ? (
                                <div className="space-y-4">
                                    {student.guardians.map((gRef: any) => {
                                        const g = gRef.guardian
                                        const isPrimary = gRef.is_primary
                                        const hasSigned = signatures.some(s => s.guardian_id === g.id && s.document_type === 'Condiciones Generales Academia')
                                        return (
                                            <div key={g.id} className="group relative bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-yellow-200 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                                            {g.full_name}
                                                            {isPrimary && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-bold">Principal</span>}
                                                            {hasSigned && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <ShieldCheck className="h-4 w-4 text-green-500" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Documentos firmados</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{gRef.relationship || 'Tutor'}</div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 -mt-1 -mr-1"
                                                        onClick={async () => {
                                                            if (confirm('¿Desvincular a este tutor?')) {
                                                                await unlinkGuardian(childId, g.id)
                                                                fetchStudentData()
                                                                toast.success('Tutor desvinculado')
                                                            }
                                                        }}
                                                    >
                                                        <UserMinus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {g.phone && (
                                                        <a href={`tel:${g.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-yellow-600 transition-colors text-xs">
                                                            <Phone className="h-3 w-3" /> <span>{g.phone}</span>
                                                        </a>
                                                    )}
                                                    <a href={`mailto:${g.email}`} className="flex items-center gap-2 text-slate-600 hover:text-yellow-600 transition-colors text-xs">
                                                        <Mail className="h-3 w-3" /> <span className="truncate">{g.email}</span>
                                                    </a>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-4 text-center">
                                    <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center mb-2">
                                        <User className="h-5 w-5 text-red-500" />
                                    </div>
                                    <p className="text-red-500 font-bold text-xs uppercase">Sin tutor asignado</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Activity className="h-4 w-4 text-slate-700" /> Ficha Técnica
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            <div className="flex justify-between items-center group">
                                <span className="text-slate-500 font-medium">Posición:</span>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors font-bold">Delantero</Badge>
                            </div>
                            <Separator className="opacity-50" />
                            <div className="flex justify-between items-center group">
                                <span className="text-slate-500 font-medium">Pierna hábil:</span>
                                <span className="font-bold text-slate-900">Derecha</span>
                            </div>
                            <Separator className="opacity-50" />
                            <div className="flex justify-between items-center group">
                                <span className="text-slate-500 font-medium">Talla Camiseta:</span>
                                <span className="font-bold text-slate-900">M Junior</span>
                            </div>
                            <Separator className="opacity-50" />
                            <div className="flex justify-between items-center group">
                                <span className="text-slate-500 font-medium">Dorsal:</span>
                                <span className="font-black text-yellow-500 text-lg leading-none">10</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Areas */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="performance" className="space-y-6">
                        <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex overflow-x-auto scrollbar-hide">
                            <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs uppercase px-6 h-9">
                                Rendimiento
                            </TabsTrigger>
                            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs uppercase px-6 h-9">
                                Resumen
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs uppercase px-6 h-9">
                                Documentos
                            </TabsTrigger>
                            <TabsTrigger value="finance" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs uppercase px-6 h-9">
                                Pagos
                            </TabsTrigger>
                            <TabsTrigger value="gamification" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs uppercase px-6 h-9">
                                Gamificación
                            </TabsTrigger>
                        </TabsList>

                        {/* Performance Tab */}
                        <TabsContent value="performance" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border-none shadow-xl bg-white overflow-hidden group">
                                    <CardHeader className="pb-0">
                                        <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-yellow-500" /> Perfil de Atributos
                                        </CardTitle>
                                        <CardDescription className="text-xs font-medium uppercase tracking-wider">Última evaluación: 12/02/2026</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0 relative">
                                        {metrics ? (
                                            <div className="mt-4">
                                                <PlayerRadarChart metrics={isEditingMetrics ? tempMetrics : metrics} />
                                            </div>
                                        ) : (
                                            <div className="h-[250px] flex items-center justify-center text-muted-foreground italic">No hay datos de rendimiento disponibles</div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-xl bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-black tracking-tight">Desglose Técnico</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {tempMetrics && (
                                            <div className="space-y-4">
                                                <MetricBar
                                                    label="Ritmo"
                                                    value={isEditingMetrics ? tempMetrics.pace : metrics.pace}
                                                    color="bg-blue-500"
                                                    editable={isEditingMetrics}
                                                    onChange={(v) => setTempMetrics({ ...tempMetrics, pace: v })}
                                                />
                                                <MetricBar
                                                    label="Tiro"
                                                    value={isEditingMetrics ? tempMetrics.shooting : metrics.shooting}
                                                    color="bg-red-500"
                                                    editable={isEditingMetrics}
                                                    onChange={(v) => setTempMetrics({ ...tempMetrics, shooting: v })}
                                                />
                                                <MetricBar
                                                    label="Pase"
                                                    value={isEditingMetrics ? tempMetrics.passing : metrics.passing}
                                                    color="bg-slate-700"
                                                    editable={isEditingMetrics}
                                                    onChange={(v) => setTempMetrics({ ...tempMetrics, passing: v })}
                                                />
                                                <MetricBar
                                                    label="Regate"
                                                    value={isEditingMetrics ? tempMetrics.dribbling : metrics.dribbling}
                                                    color="bg-yellow-500"
                                                    editable={isEditingMetrics}
                                                    onChange={(v) => setTempMetrics({ ...tempMetrics, dribbling: v })}
                                                />
                                                <MetricBar
                                                    label="Defensa"
                                                    value={isEditingMetrics ? tempMetrics.defending : metrics.defending}
                                                    color="bg-green-500"
                                                    editable={isEditingMetrics}
                                                    onChange={(v) => setTempMetrics({ ...tempMetrics, defending: v })}
                                                />
                                                <MetricBar
                                                    label="Físico"
                                                    value={isEditingMetrics ? tempMetrics.physical : metrics.physical}
                                                    color="bg-orange-500"
                                                    editable={isEditingMetrics}
                                                    onChange={(v) => setTempMetrics({ ...tempMetrics, physical: v })}
                                                />
                                            </div>
                                        )}

                                        {isEditingMetrics ? (
                                            <div className="flex gap-2 mt-6">
                                                <Button
                                                    onClick={handleSaveMetrics}
                                                    disabled={isSavingMetrics}
                                                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-11"
                                                >
                                                    {isSavingMetrics ? "Guardando..." : "Guardar Cambios"}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsEditingMetrics(false)
                                                        setTempMetrics(metrics)
                                                    }}
                                                    className="font-bold h-11"
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => setIsEditingMetrics(true)}
                                                className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-11 shadow-md transform hover:scale-[1.02] transition-all"
                                            >
                                                Modificar Atributos
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <PlayerEvolutionChart metricsHistory={metricsHistory} />
                        </TabsContent>

                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <Card className="border-none shadow-md overflow-hidden bg-white">
                                    <CardHeader className="pb-2 border-b border-slate-50">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Asistencia Actual</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 flex items-center justify-between">
                                        <div>
                                            <div className="text-4xl font-black text-slate-900">92%</div>
                                            <p className="text-xs text-green-600 font-bold mt-1">+4% vs. mes anterior</p>
                                        </div>
                                        <div className="h-16 w-16 rounded-full border-4 border-green-500 border-t-slate-100 flex items-center justify-center font-bold text-green-600">
                                            OK
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-md overflow-hidden bg-white">
                                    <CardHeader className="pb-2 border-b border-slate-50">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Estado de Pagos</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 flex items-center justify-between">
                                        <div>
                                            <div className="text-4xl font-black text-green-600 uppercase">Al día</div>
                                            <p className="text-xs text-slate-500 font-bold mt-1">Próximo vencimiento: 01 Mar</p>
                                        </div>
                                        <Wallet className="h-12 w-12 text-slate-200" />
                                    </CardContent>
                                </Card>
                            </div>



                            <div className="grid gap-6 md:grid-cols-2">
                                <Card className="border-none shadow-md bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-black">Familia y Contacto</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {student.guardians?.map((g: any) => (
                                                <div key={g.guardian.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">{g.guardian.full_name}</p>
                                                        <p className="text-xs text-slate-500 capitalize">{g.relationship || 'Tutor'}{g.is_primary && ' (Principal)'}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a href={`tel:${g.guardian.phone}`} className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-yellow-600 hover:border-yellow-200 transition-colors">
                                                            <Phone className="h-4 w-4" />
                                                        </a>
                                                        <a href={`mailto:${g.guardian.email}`} className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-yellow-600 hover:border-yellow-200 transition-colors">
                                                            <Mail className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!student.guardians || student.guardians.length === 0) && (
                                                <p className="text-sm text-slate-400 italic">No hay tutores registrados</p>
                                            )}
                                            <div className="pt-4 border-t border-slate-100">
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">Dirección</p>
                                                        <p className="text-sm text-slate-500">{student.address || 'No registrada'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-md bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-black">Timeline de Actividad</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6 relative ml-4">
                                            <div className="absolute left-[-1.15rem] top-2 h-[calc(100%-1rem)] w-0.5 bg-slate-100"></div>
                                            <ActivityItem icon={<Activity className="text-yellow-600" />} title="Asistencia a Entrenamiento" date="Hoy, 18:30" description="Campo 1 - Entrenamiento Técnico" />
                                            <ActivityItem icon={<Wallet className="text-green-600" />} title="Confirmación de Pago" date="Lun 10 Feb, 10:15" description="Cuota Febrero 2026 - PayPal" />
                                            <ActivityItem icon={<FileText className="text-blue-600" />} title="Documento Actualizado" date="Vie 07 Feb, 14:00" description="Ficha Médica renovada por el tutor" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-none shadow-md bg-white">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-black flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-yellow-500" />
                                            Historial de Seguimiento
                                        </CardTitle>
                                    </div>
                                    <CardDescription>Bitácora cronológica del alumno.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* New Note Input */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                        <input
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                                            placeholder="Título (opcional)"
                                            value={noteForm.title}
                                            onChange={e => setNoteForm({ ...noteForm, title: e.target.value })}
                                        />
                                        <textarea
                                            className="w-full min-h-[80px] p-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 resize-none text-sm"
                                            placeholder="Escribe una nueva observación..."
                                            value={noteForm.content}
                                            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                                        ></textarea>
                                        <div className="flex justify-end gap-2">
                                            {editingNoteId && (
                                                <Button
                                                    onClick={handleCancelEdit}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-500"
                                                >
                                                    <X className="h-4 w-4 mr-1" /> Cancelar
                                                </Button>
                                            )}
                                            <Button
                                                onClick={handleAddNote}
                                                disabled={isSavingNote || !noteForm.content}
                                                size="sm"
                                                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                            >
                                                {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingNoteId ? "Actualizar Nota" : "Añadir Nota")}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Notes Timeline */}
                                    <div className="space-y-4 relative pl-4">
                                        <div className="absolute left-[0.45rem] top-2 h-[calc(100%-1rem)] w-0.5 bg-slate-100"></div>
                                        {coachNotes.length > 0 ? (
                                            coachNotes.map((note) => (
                                                <div key={note.id} className="relative group">
                                                    <div className={`absolute left-[-1.3rem] top-1 h-3 w-3 rounded-full border-2 border-white shadow-sm z-10 ${editingNoteId === note.id ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
                                                    <div className={`bg-white border p-4 rounded-xl transition-all ${editingNoteId === note.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-slate-100 hover:shadow-md'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 text-sm">{note.title}</h4>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(note.note_date).toLocaleDateString()}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleEditNote(note)}
                                                                    className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded"
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingNoteId(note.id)}
                                                                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-400 italic pl-2">No hay notas registradas.</p>
                                        )}
                                    </div>

                                    <AlertDialog open={!!deletingNoteId} onOpenChange={(open) => !open && setDeletingNoteId(null)}>
                                        <AlertDialogContent className="bg-white border-slate-200 shadow-xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Se eliminará la nota permanentemente.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-slate-50 border-slate-200">Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={confirmDeleteNote}
                                                    className="bg-red-500 hover:bg-red-600 text-white font-bold"
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Documents Tab - Real Records Here */}
                        <TabsContent value="documents" className="space-y-6">
                            <Card className="border-none shadow-md bg-white">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-900">Repositorio Documental</CardTitle>
                                        <CardDescription className="text-slate-500">Archivos oficiales centralizados</CardDescription>
                                    </div>
                                    <DocumentUploader childId={childId} onSuccess={fetchStudentData} />
                                </CardHeader>
                                <CardContent>
                                    {documents.length > 0 ? (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {documents.map((doc) => (
                                                <DocItem key={doc.id} title={doc.name} size={doc.size} type={doc.type} url={doc.url} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            <FileText className="h-12 w-12 text-slate-300 mb-4" />
                                            <p className="text-slate-500 font-medium">No hay documentos registrados</p>
                                            <p className="text-xs text-slate-400 mt-1">Usa el botón superior para subir el primer archivo</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Payments Tab */}
                        <TabsContent value="finance" className="space-y-6">
                            <Card className="border-none shadow-md bg-white">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                                            <Wallet className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-black text-slate-900">Gestión de Pagos</CardTitle>
                                            <CardDescription className="text-slate-500">Historial de cuotas y estado financiero</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <PaymentsList
                                        paymentsData={paymentsData}
                                        plans={plans}
                                        childId={childId}
                                        onRefresh={fetchStudentData}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Gamification Tab */}
                        <TabsContent value="gamification" className="space-y-6">
                            <Card className="border-none shadow-md bg-white">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                                            <Trophy className="h-5 w-5 text-yellow-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-black text-slate-900">Salón de Trofeos</CardTitle>
                                            <CardDescription className="text-slate-500">Logros desbloqueados y recompensas</CardDescription>
                                        </div>
                                    </div>
                                    <ManageAchievementsDialog achievements={achievements} onUpdate={fetchStudentData} />
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {achievements.map((ach) => {
                                            const isEarned = studentAchievements.some((sa) => sa.achievement_id === ach.id)
                                            return (
                                                <div
                                                    key={ach.id}
                                                    onClick={() => handleToggleAchievement(ach.id)}
                                                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 group relative flex flex-col items-center text-center space-y-2 ${isEarned
                                                        ? 'bg-gradient-to-br from-yellow-50 to-white border-yellow-400 shadow-md transform hover:scale-[1.03]'
                                                        : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-100 hover:border-yellow-200 hover:bg-white'
                                                        }`}
                                                >
                                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors duration-300 ${isEarned ? 'bg-yellow-400 text-yellow-900 shadow-inner' : 'bg-slate-200 text-slate-400 group-hover:bg-yellow-100 group-hover:text-yellow-600'
                                                        }`}>
                                                        <Trophy className="h-6 w-6" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className={`text-xs font-black uppercase tracking-tight ${isEarned ? 'text-slate-900' : 'text-slate-500'}`}>{ach.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{ach.description}</p>
                                                    </div>

                                                    {isEarned && (
                                                        <div className="absolute top-1 right-1">
                                                            <div className="bg-yellow-400 text-yellow-900 rounded-full p-0.5 shadow-sm">
                                                                <Star className="h-2 w-2 fill-current" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        {achievements.length === 0 && (
                                            <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <p className="text-sm text-slate-400 font-bold uppercase">No hay logros configurados</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div >
    )
}

function MetricBar({ label, value, color, editable, onChange }: { label: string, value: number, color: string, editable?: boolean, onChange?: (val: number) => void }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-900 font-black">{value}</span>
            </div>
            {editable ? (
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => onChange?.(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            ) : (
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                    <div
                        className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
                        style={{ width: `${value}%` }}
                    ></div>
                </div>
            )}
        </div>
    )
}

function ActivityItem({ icon, title, date, description }: { icon: React.ReactNode, title: string, date: string, description: string }) {
    return (
        <div className="relative flex gap-4">
            <div className="absolute left-[-1.5rem] mt-1 h-3 w-3 rounded-full bg-white border-2 border-slate-900 shadow-sm z-10"></div>
            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                {icon}
            </div>
            <div>
                <p className="font-bold text-sm text-slate-900 leading-none mb-1">{title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-2">{date}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
        </div>
    )
}

function DocItem({ title, size, type, url }: { title: string, size: string, type: string, url: string }) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 border rounded-xl bg-white hover:shadow-xl hover:border-yellow-200 transition-all cursor-pointer group border-slate-100 shadow-sm"
        >
            <div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform shadow-inner">
                <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{title}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{size} • {type.toUpperCase()}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <ChevronRight className="h-4 w-4" />
            </div>
        </a>
    )
}
