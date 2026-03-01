'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { resetTutorPassword } from '@/app/actions/guardians'
import { toast } from 'sonner'
import { Loader2, KeyRound } from 'lucide-react'

export function ResetPasswordButton({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(false)

    const handleReset = async () => {
        if (!confirm('¿Estás seguro de que quieres resetear la contraseña de este usuario? Se cambiará a "CostaBrava2026" y el usuario podrá iniciar sesión con ella.')) {
            return
        }

        setLoading(true)
        try {
            const result = await resetTutorPassword(userId)
            if (result.success) {
                toast.success('Contraseña reseteada a CostaBrava2026')
            } else {
                toast.error(result.error || 'Error al resetear contraseña')
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado al resetear la contraseña')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleReset} disabled={loading} className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:hover:bg-amber-900/20">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Resetear Contraseña
        </Button>
    )
}
