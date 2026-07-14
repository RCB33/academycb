'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (password.length < 10) return toast.error('Usa al menos 10 caracteres.')
        if (password !== confirmation) return toast.error('Las contraseñas no coinciden.')

        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)

        if (error) return toast.error('No se pudo guardar la contraseña. Solicita un enlace nuevo.')
        toast.success('Contraseña establecida correctamente')
        router.replace('/portal/dashboard')
        router.refresh()
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-navy p-4">
            <Card className="w-full max-w-md border-white/10 shadow-2xl">
                <CardHeader className="text-center">
                    <KeyRound className="mx-auto mb-3 h-10 w-10 text-gold" />
                    <CardTitle className="text-2xl">Establece tu contraseña</CardTitle>
                    <CardDescription>Elige una contraseña exclusiva para acceder al portal de familias.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nueva contraseña</Label>
                            <Input id="password" type="password" minLength={10} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmation">Repite la contraseña</Label>
                            <Input id="confirmation" type="password" minLength={10} autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                        </div>
                        <Button className="w-full bg-gold text-navy" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar y entrar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    )
}
