'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Search, Filter, User, MoreHorizontal, GraduationCap, Tent, Calendar, X, Trophy, ClipboardCheck, Mail, Phone, UserPlus, ArchiveRestore } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { CreateStudentDialog } from "@/components/admin/create-student-dialog"
import { archiveStudent, restoreStudent } from "@/app/actions/students"
import { convertEnrollmentRequest, updateEnrollmentRequestStatus } from "@/app/actions/enrollment"
import { toast } from "sonner"

export default function CRMMasterListPage() {
    const [students, setStudents] = useState<any[]>([])
    const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([])
    const [canConvertEnrollment, setCanConvertEnrollment] = useState(false)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [selectedLifecycle, setSelectedLifecycle] = useState<'active' | 'archived' | 'all'>('active')

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        refreshData()
    }, [])

    async function refreshData() {
        setLoading(true)
        const [studentResult, enrollmentResult, profileResult] = await Promise.all([
            supabase.from('children').select(`
                *,
                category:categories(name, id),
                academy_memberships(id, status),
                campus_enrollments(id, status),
                tournament_players(id, status)
            `).order('full_name'),
            supabase.from('enrollment_requests').select('*').order('created_at', { ascending: false }),
            supabase.auth.getUser().then(async ({ data: { user } }) => {
                if (!user) return null
                const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
                return data
            }),
        ])

        if (studentResult.data) {
            setStudents(studentResult.data)
        } else if (studentResult.error) {
            toast.error('No se pudo cargar Jugadores 360º')
        }
        if (enrollmentResult.data) setEnrollmentRequests(enrollmentResult.data)
        else if (enrollmentResult.error) toast.error('No se pudieron cargar las solicitudes de inscripción')
        setCanConvertEnrollment(profileResult?.role === 'admin')
        setLoading(false)
    }

    // Prepare filter options
    const categories = Array.from(new Set(students.map(s => s.category?.name).filter(Boolean)))
    const years = Array.from(new Set(students.map(s => s.birth_year).filter(Boolean))).sort().reverse()

    const filtered = students.filter(s => {
        const matchesLifecycle = selectedLifecycle === 'all' || (selectedLifecycle === 'archived' ? Boolean(s.archived_at) : !s.archived_at)
        const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || s.category?.name === selectedCategory
        const matchesYear = selectedYear === 'all' || s.birth_year?.toString() === selectedYear
        const links = getBranchLinks(s)
        const matchesBranch = selectedBranch === 'all'
            || (selectedBranch === 'none' ? links.length === 0 : links.includes(selectedBranch))
        return matchesLifecycle && matchesSearch && matchesCategory && matchesYear && matchesBranch
    })

    const handleArchive = async (id: string, name: string) => {
        if (!confirm(`¿Archivar a ${name}? Se ocultará de los jugadores activos, pero se conservará todo su historial y podrás restaurarlo cuando vuelva.`)) return
        
        setLoading(true)
        const result = await archiveStudent(id)
        if (result.success) {
            toast.success("Jugador archivado. Su historial se conserva.")
            refreshData()
        } else {
            toast.error("Error al eliminar: " + result.error)
            setLoading(false)
        }
    }

    const handleRestore = async (id: string, name: string) => {
        const result = await restoreStudent(id)
        if (result.success) { toast.success(`${name} vuelve a estar activo`); refreshData() }
        else toast.error("Error al restaurar: " + result.error)
    }

    async function updateEnrollmentStatus(id: string, status: string) {
        const result = await updateEnrollmentRequestStatus(id, status)
        if (!result.success) toast.error(result.error || 'No se pudo actualizar la solicitud')
        else {
            toast.success('Solicitud actualizada')
            refreshData()
        }
    }

    async function acceptEnrollmentRequest(id: string) {
        const toastId = toast.loading('Creando la ficha del jugador…')
        try {
            const result = await convertEnrollmentRequest(id)
            if (!result.success) toast.error(result.error || 'No se pudo crear la ficha')
            else {
                toast.success('Solicitud aceptada: ficha de alumno y tutor creada')
                refreshData()
            }
        } catch {
            toast.error('No se pudo completar la ficha. Actualiza la página e inténtalo de nuevo.')
        } finally {
            toast.dismiss(toastId)
        }
    }

    const pendingEnrollmentRequests = enrollmentRequests.filter((request) => request.status !== 'enrolled' && request.status !== 'lost')

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Jugadores 360º</h1>
                    <p className="text-muted-foreground">Ficha maestra y vinculaciones con Academia, Campus y Torneos</p>
                </div>
                <CreateStudentDialog onUpdate={refreshData} />
            </div>

            <Card className="border-gold/30">
                <CardHeader className="border-b bg-gold/5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-gold/15 p-2 text-gold"><ClipboardCheck className="h-5 w-5" /></div>
                            <div>
                                <CardTitle className="text-xl">Solicitudes de inscripción</CardTitle>
                                <CardDescription>Revisa las solicitudes web antes de crear las fichas en Jugadores 360º.</CardDescription>
                            </div>
                        </div>
                        <Badge variant="outline" className="w-fit border-gold/40 bg-white text-navy">{pendingEnrollmentRequests.length} pendientes</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {loading ? <p className="text-sm text-muted-foreground">Cargando solicitudes…</p> : pendingEnrollmentRequests.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-muted-foreground">No hay solicitudes de inscripción pendientes.</p>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {pendingEnrollmentRequests.map((request) => (
                                <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="font-bold text-navy">{request.child_name}</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">{enrollmentServiceLabel(request.service)}{request.activity_name ? ` · ${request.activity_name}` : ''}</p>
                                        </div>
                                        <Badge className={enrollmentStatusClass(request.status)}>{enrollmentStatusLabel(request.status)}</Badge>
                                    </div>
                                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                        <p><span className="font-semibold text-slate-800">Tutor/a:</span> {request.guardian_name}</p>
                                        <p><span className="font-semibold text-slate-800">Nacimiento:</span> {new Date(`${request.birth_date}T00:00:00`).toLocaleDateString('es-ES')}</p>
                                        <a className="inline-flex items-center gap-1.5 font-medium text-navy hover:underline" href={`mailto:${request.email}`}><Mail className="h-4 w-4" />{request.email}</a>
                                        <a className="inline-flex items-center gap-1.5 font-medium text-navy hover:underline" href={`tel:${request.phone}`}><Phone className="h-4 w-4" />{request.phone}</a>
                                    </div>
                                    {request.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{request.notes}</p>}
                                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                                        <Button size="sm" variant="outline" onClick={() => updateEnrollmentStatus(request.id, 'contacted')}>Contactado</Button>
                                        <Button size="sm" variant="outline" onClick={() => updateEnrollmentStatus(request.id, 'interested')}>En trámite</Button>
                                        {canConvertEnrollment && <Button size="sm" className="bg-gold font-bold text-navy hover:bg-gold/80" onClick={() => acceptEnrollmentRequest(request.id)}><UserPlus className="mr-1.5 h-4 w-4" />Aceptar y crear ficha</Button>}
                                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => updateEnrollmentStatus(request.id, 'lost')}>Descartar</Button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b px-6 py-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                            {([['active', 'Activos'], ['archived', 'Archivados'], ['all', 'Todos']] as const).map(([value, label]) => <Button key={value} variant={selectedLifecycle === value ? 'default' : 'outline'} size="sm" onClick={() => setSelectedLifecycle(value)}>{label}</Button>)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                ['all', 'Todos'],
                                ['academy', 'Academia'],
                                ['campus', 'Campus'],
                                ['tournament', 'Torneos'],
                                ['none', 'Sin vinculación'],
                            ].map(([value, label]) => (
                                <Button key={value} variant={selectedBranch === value ? 'default' : 'outline'} size="sm"
                                    onClick={() => setSelectedBranch(value)}>{label}</Button>
                            ))}
                        </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-2">
                                        <Filter className="h-4 w-4" />
                                        {selectedCategory !== 'all' ? selectedCategory : 'Categoría'}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px] bg-white dark:bg-slate-950">
                                    <DropdownMenuLabel>Filtrar por Categoría</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                                        Todas
                                    </DropdownMenuItem>
                                    {categories.map((cat: any) => (
                                        <DropdownMenuItem key={cat} onClick={() => setSelectedCategory(cat)}>
                                            {cat}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {selectedYear !== 'all' ? selectedYear : 'Año'}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px] bg-white dark:bg-slate-950">
                                    <DropdownMenuLabel>Filtrar por Año</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setSelectedYear('all')}>
                                        Todos
                                    </DropdownMenuItem>
                                    {years.map((year: any) => (
                                        <DropdownMenuItem key={year} onClick={() => setSelectedYear(year.toString())}>
                                            {year}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {(selectedCategory !== 'all' || selectedYear !== 'all' || selectedBranch !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setSelectedCategory('all'); setSelectedYear('all'); setSelectedBranch('all') }}
                                    className="h-9 px-2 hover:bg-red-50 hover:text-red-600"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b bg-muted/40">
                                <tr className="border-b transition-colors">
                                    <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Alumno</th>
                                    <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Año</th>
                                    <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Categoría</th>
                                    <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Vinculación</th>
                                    <th className="h-12 px-6 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Cargando base de datos...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{selectedLifecycle === 'archived' ? 'No hay jugadores archivados.' : 'No se encontraron alumnos.'}</td></tr>
                                ) : (
                                    filtered.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                            onClick={() => router.push(`/admin/crm/alumnos/${student.id}`)}
                                        >
                                            <td className="p-6 font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                                        <User className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span className="font-semibold">{student.full_name}</span>
                                                    {student.archived_at && <Badge variant="secondary" className="bg-slate-100 text-slate-600">Archivado</Badge>}
                                                </div>
                                            </td>
                                            <td className="p-6">{student.birth_year}</td>
                                            <td className="p-6">
                                                <Badge variant="outline" className="font-normal text-slate-600">
                                                    {student.category?.name || '---'}
                                                </Badge>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex gap-2">
                                                    {getBranchLinks(student).includes('academy') && <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1"><GraduationCap className="h-3 w-3" /> Academia</Badge>}
                                                    {getBranchLinks(student).includes('campus') && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><Tent className="h-3 w-3" /> Campus</Badge>}
                                                    {getBranchLinks(student).includes('tournament') && <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Trophy className="h-3 w-3" /> Torneos</Badge>}
                                                    {getBranchLinks(student).length === 0 && <Badge variant="outline" className="text-slate-400">Sin vinculación</Badge>}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <Link href={`/admin/crm/alumnos/${student.id}`}>
                                                            <DropdownMenuItem>
                                                                Ver Perfil 360º
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <Link href={`/admin/crm/alumnos/${student.id}?edit=true`}>
                                                            <DropdownMenuItem>Editar Datos</DropdownMenuItem>
                                                        </Link>
                                                        <DropdownMenuSeparator />
                                                        {student.archived_at ? <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRestore(student.id, student.full_name) }}><ArchiveRestore className="mr-2 h-4 w-4" />Restaurar jugador</DropdownMenuItem> : <DropdownMenuItem className="text-amber-700" onClick={(e) => { e.stopPropagation(); handleArchive(student.id, student.full_name) }}><ArchiveRestore className="mr-2 h-4 w-4" />Archivar jugador</DropdownMenuItem>}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function getBranchLinks(student: any) {
    const links: string[] = []
    if (student.academy_memberships?.some((item: any) => item.status !== 'cancelled')) links.push('academy')
    if (student.campus_enrollments?.some((item: any) => item.status !== 'cancelled')) links.push('campus')
    if (student.tournament_players?.some((item: any) => item.status !== 'cancelled')) links.push('tournament')
    return links
}

function enrollmentServiceLabel(service: string) {
    if (service === 'academy') return 'Academia'
    if (service === 'campus') return 'Campus'
    if (service === 'tournament') return 'Torneo'
    return 'Inscripción'
}

function enrollmentStatusLabel(status: string) {
    if (status === 'new') return 'Nueva'
    if (status === 'contacted') return 'Contactado'
    if (status === 'interested') return 'En trámite'
    return status
}

function enrollmentStatusClass(status: string) {
    if (status === 'new') return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
    if (status === 'contacted') return 'bg-amber-100 text-amber-800 hover:bg-amber-100'
    return 'bg-violet-100 text-violet-800 hover:bg-violet-100'
}
