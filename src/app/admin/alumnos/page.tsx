'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table" // Need to create Table component or use primitive divs
import { Search, Plus, Filter, MoreHorizontal } from "lucide-react"
import Link from 'next/link'

// Quick Table component mock if not existing, or I should create generic table component first. 
// I will use raw HTML table with tailwind classes for speed as I didn't create table.tsx yet.
// Actually, creating `components/ui/table.tsx` is better practice. I will do that in the next step or inline it if simple.
// I'll inline for now to avoid context switching too much, but styled nicely.

export default function AdminAlumnosPage() {
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const supabase = createClient()

    useEffect(() => {
        fetchStudents()
    }, [])

    async function fetchStudents() {
        setLoading(true)
        const { data, error } = await supabase
            .from('children')
            .select('*, category:categories(name)')
            .order('full_name') // Order by name ASC

        if (data) setStudents(data)
        setLoading(false)
    }

    const filtered = students.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Alumnos</h1>
                <Button><Plus className="mr-2 h-4 w-4" /> Nuevo Alumno</Button>
            </div>

            <Card>
                <div className="p-4 flex gap-4 items-center border-b">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                </div>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Año</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Categoría</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {loading ? (
                                <tr><td colSpan={4} className="p-4 text-center">Cargando...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No se encontraron alumnos.</td></tr>
                            ) : (
                                filtered.map((student) => (
                                    <tr key={student.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 font-medium">{student.full_name}</td>
                                        <td className="p-4">{student.birth_year}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
                                                {student.category?.name || '---'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {/* View Details / Edit */}
                                                <Link href={`/admin/alumnos/${student.id}`}>
                                                    <Button variant="ghost" size="sm">Ver Ficha</Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
