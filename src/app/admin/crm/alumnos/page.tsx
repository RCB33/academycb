'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Search, Filter, User, MoreHorizontal, GraduationCap, Tent, Calendar, X, Trophy } from "lucide-react"
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
import { deleteStudent } from "@/app/actions/students"
import { toast } from "sonner"

export default function CRMMasterListPage() {
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [selectedBranch, setSelectedBranch] = useState<string>('all')

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchStudents()
    }, [])

    async function fetchStudents() {
        setLoading(true)
        const { data, error } = await supabase
            .from('children')
            .select(`
                *,
                category:categories(name, id),
                academy_memberships(id, status),
                campus_enrollments(id, status),
                tournament_players(id, status)
            `)
            .order('full_name')

        if (data) {
            setStudents(data)
        } else if (error) {
            toast.error('No se pudo cargar Jugadores 360º')
        }
        setLoading(false)
    }

    // Prepare filter options
    const categories = Array.from(new Set(students.map(s => s.category?.name).filter(Boolean)))
    const years = Array.from(new Set(students.map(s => s.birth_year).filter(Boolean))).sort().reverse()

    const filtered = students.filter(s => {
        const matchesSearch = s.full_name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || s.category?.name === selectedCategory
        const matchesYear = selectedYear === 'all' || s.birth_year?.toString() === selectedYear
        const links = getBranchLinks(s)
        const matchesBranch = selectedBranch === 'all'
            || (selectedBranch === 'none' ? links.length === 0 : links.includes(selectedBranch))
        return matchesSearch && matchesCategory && matchesYear && matchesBranch
    })

    const handleArchive = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar a ${name}? Esta acción no se puede deshacer.`)) return
        
        setLoading(true)
        const result = await deleteStudent(id)
        if (result.success) {
            toast.success("Alumno eliminado correctamente")
            fetchStudents()
        } else {
            toast.error("Error al eliminar: " + result.error)
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Jugadores 360º</h1>
                    <p className="text-muted-foreground">Ficha maestra y vinculaciones con Academia, Campus y Torneos</p>
                </div>
                <CreateStudentDialog onUpdate={fetchStudents} />
            </div>

            <Card>
                <CardHeader className="border-b px-6 py-4">
                    <div className="flex flex-col gap-4">
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
                                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No se encontraron alumnos.</td></tr>
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
                                                        <DropdownMenuItem 
                                                            className="text-red-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleArchive(student.id, student.full_name)
                                                            }}
                                                        >
                                                            Archivar
                                                        </DropdownMenuItem>
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
