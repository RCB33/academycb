'use client'

import { useState, useEffect } from 'react'
import { getGuardians } from '@/app/actions/guardians'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Search, Users, MoreHorizontal, Mail, Phone, Tent, Plus } from "lucide-react"
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
import { GuardianDialog } from "./components/guardian-dialog"

export default function TutorsMasterListPage() {
    const [guardians, setGuardians] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const router = useRouter()

    useEffect(() => {
        fetchGuardians()
    }, [])

    async function fetchGuardians() {
        setLoading(true)
        const data = await getGuardians()
        setGuardians(data || [])
        setLoading(false)
    }

    const filtered = guardians.filter(g => {
        const matchesSearch =
            g.full_name.toLowerCase().includes(search.toLowerCase()) ||
            (g.email && g.email.toLowerCase().includes(search.toLowerCase())) ||
            (g.phone && g.phone.includes(search))
        return matchesSearch
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">CRM Familias</h1>
                    <p className="text-muted-foreground">Base de datos de tutores y responsables</p>
                </div>
                <GuardianDialog mode="create" onUpdate={fetchGuardians} />
            </div>

            <Card>
                <CardHeader className="border-b px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, email o teléfono..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b bg-muted/40">
                                <tr className="border-b transition-colors">
                                    <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Tutor</th>
                                    <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Contacto</th>
                                    <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Hijos Vinculados</th>
                                    <th className="h-12 px-6 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Cargando base de datos...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No se encontraron tutores.</td></tr>
                                ) : (
                                    filtered.map((guardian) => (
                                        <tr
                                            key={guardian.id}
                                            className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                            onClick={() => router.push(`/admin/crm/tutores/${guardian.id}`)}
                                        >
                                            <td className="p-6 font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                                                        <Users className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-semibold">{guardian.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1 text-slate-500 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-3 w-3" /> {guardian.email || '---'}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3" /> {guardian.phone || '---'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1">
                                                    {guardian.children && guardian.children.length > 0 ? (
                                                        guardian.children.map((cGuard: any, idx: number) => (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <span className="font-medium text-slate-900">{cGuard.child?.full_name}</span>
                                                                <Badge variant="outline" className="text-[10px] h-4 py-0 leading-none">
                                                                    {cGuard.child?.category?.name || '---'}
                                                                </Badge>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-xs">Sin vínculos</span>
                                                    )}
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
                                                        <Link href={`/admin/crm/tutores/${guardian.id}`}>
                                                            <DropdownMenuItem>
                                                                Ver Ficha Tutor
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <GuardianDialog
                                                                mode="edit"
                                                                guardian={guardian}
                                                                onUpdate={fetchGuardians}
                                                                trigger={
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        Editar Datos
                                                                    </DropdownMenuItem>
                                                                }
                                                            />
                                                        </div>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600">Eliminar</DropdownMenuItem>
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
