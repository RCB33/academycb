'use client'

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getAvailableGuardiansForChild, linkGuardianById } from "@/app/actions/students"
import { toast } from "sonner"
import { KeyRound, Loader2, Mail, Phone, Search, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function LinkGuardianDialog({ childId, onUpdate }: { childId: string, onUpdate?: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [guardians, setGuardians] = useState<any[]>([])
    const [loadingGuardians, setLoadingGuardians] = useState(false)
    const [search, setSearch] = useState('')
    const [selectedGuardianId, setSelectedGuardianId] = useState('')
    const router = useRouter()

    const filteredGuardians = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return guardians
        return guardians.filter(guardian =>
            guardian.full_name?.toLowerCase().includes(term)
            || guardian.email?.toLowerCase().includes(term)
            || guardian.phone?.toLowerCase().includes(term)
        )
    }, [guardians, search])

    const handleOpenChange = async (nextOpen: boolean) => {
        setOpen(nextOpen)
        if (!nextOpen) {
            setSearch('')
            setSelectedGuardianId('')
            return
        }
        setLoadingGuardians(true)
        setGuardians(await getAvailableGuardiansForChild(childId))
        setLoadingGuardians(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedGuardianId) return toast.error('Selecciona un tutor')
        setLoading(true)
        try {
            const result = await linkGuardianById(childId, selectedGuardianId)
            if (result.success) {
                toast.success("Tutor vinculado correctamente")
                setOpen(false)
                setSearch('')
                setSelectedGuardianId('')
                if (onUpdate) {
                    onUpdate()
                }
                router.refresh()
            } else {
                toast.error(result.error || "Error al vincular tutor")
            }
        } catch (error) {
            toast.error("Error desconocido")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-dashed">
                    <UserPlus className="mr-2 h-4 w-4" /> Vincular Tutor
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] bg-white text-slate-900 border-slate-200">
                <DialogHeader>
                    <DialogTitle>Vincular tutor existente</DialogTitle>
                    <DialogDescription>
                        Busca en el CRM por nombre, email o teléfono. Vincularlo permite que vea a este alumno si tiene acceso al Portal Familias.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar tutor..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2">
                        {loadingGuardians ? (
                            <div className="py-8 text-center text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Cargando tutores...</div>
                        ) : filteredGuardians.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-400">No hay tutores disponibles con esa búsqueda.</div>
                        ) : filteredGuardians.map(guardian => (
                            <button
                                type="button"
                                key={guardian.id}
                                onClick={() => setSelectedGuardianId(guardian.id)}
                                className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedGuardianId === guardian.id ? 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-300' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-900">{guardian.full_name}</p>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                            {guardian.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{guardian.email}</span>}
                                            {guardian.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{guardian.phone}</span>}
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${guardian.user_id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {guardian.user_id ? 'Portal activo' : 'Solo contacto'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                        <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" />El acceso al portal se activa desde la ficha del tutor.</span>
                        <Button asChild type="button" variant="link" size="sm" className="h-auto p-0 text-blue-800 font-bold">
                            <Link href="/admin/crm/tutores">Crear tutor</Link>
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !selectedGuardianId}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Vincular
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
