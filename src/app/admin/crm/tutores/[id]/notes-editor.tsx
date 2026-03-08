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
            <div className="relative">
                {currentNotes ? (
                    <div className="space-y-4">
                        <p className="whitespace-pre-wrap">{currentNotes}</p>
                        <div className="flex justify-end mt-2">
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar Notas
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-4 space-y-3">
                        <p className="italic text-amber-700/50 text-center">No hay notas registradas para este tutor.</p>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Pencil className="mr-2 h-4 w-4" /> Añadir Notas
                        </Button>
                    </div>
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
