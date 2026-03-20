'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Search, Plus, Filter, User, MoreHorizontal, GraduationCap, Tent, Calendar, X } from "lucide-react"
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

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchStudents()
    }, [])

    async function fetchStudents() {
        setLoading(true)
        // Fetch children with their category
        const { data, error } = await supabase
            .from('children')
            .select('*, category:categories(name, id)')
            .order('full_name')

        if (data) {
            setStudents(data)
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
        return matchesSearch && matchesCategory && matchesYear
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
                    <h1 className="text-3xl font-bold tracking-tight">CRM Alumnos</h1>
                    <p className="text-muted-foreground">Base de datos unificada de jugadores</p>
                </div>
                <CreateStudentDialog onUpdate={fetchStudents} />
            </div>

            <Card>
                <CardHeader className="border-b px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
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

                            {(selectedCategory !== 'all' || selectedYear !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setSelectedCategory('all'); setSelectedYear('all') }}
                                    className="h-9 px-2 hover:bg-red-50 hover:text-red-600"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
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
                                                    {/* Mock logic for now - ideally fetch from enrollments */}
                                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 gap-1">
                                                        <GraduationCap className="h-3 w-3" /> Academia
                                                    </Badge>
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
