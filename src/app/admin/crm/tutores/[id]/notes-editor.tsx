'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateGuardianNotes } from '@/app/actions/guardians'
import { toast } from 'sonner'
import { Loader2, Pencil, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
    guardianId: string
    currentNotes: string | null
}

export function GuardianNotesEditor({ guardianId, currentNotes }: Props) {
    const [isEditing, setIsEditing] = useState(false)
    const [notes, setNotes] = useState(currentNotes || '')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await updateGuardianNotes(guardianId, notes)
            if (result.success) {
                toast.success("Notas guardadas correctamente")
                setIsEditing(false)
            } else {
                toast.error(result.error || "Error al guardar notas")
            }
        } catch (error) {
            toast.error("Error al guardar notas")
        } finally {
            setLoading(false)
        }
    }

    if (!isEditing) {
        return (
            <div className="group relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setIsEditing(true)}
                >
                    <Pencil className="h-4 w-4 text-slate-400" />
                </Button>
                {currentNotes ? (
                    <p className="whitespace-pre-wrap">{currentNotes}</p>
                ) : (
                    <p className="italic text-amber-700/50">No hay notas registradas para este tutor. Haz clic en el botón de edición para añadir notas.</p>
                )}
                {/* Fallback button for empty state if hovering isn't obvious */}
                {!currentNotes && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsEditing(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Añadir Notas
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-4 pt-2">
            <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones de cobro especial, horarios de contacto, etc."
                className="min-h-[120px] bg-white border-amber-200 focus-visible:ring-amber-500"
                autoFocus
            />
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setNotes(currentNotes || '') }} disabled={loading}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                    Guardar
                </Button>
            </div>
        </div>
    )
}
