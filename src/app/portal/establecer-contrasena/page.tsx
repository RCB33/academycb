'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRoleHome, isAppRole } from '@/lib/roles'

export default function SetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [loading, setLoading] = useState(false)
    const [checkingLink, setCheckingLink] = useState(true)
    const [sessionReady, setSessionReady] = useState(false)
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        let active = true

        const prepareSession = async () => {
            const code = new URLSearchParams(window.location.search).get('code')
            const hash = new URLSearchParams(window.location.hash.slice(1))
            const accessToken = hash.get('access_token')
            const refreshToken = hash.get('refresh_token')

            if (accessToken && refreshToken) {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                })

                if (error) {
                    if (active) setCheckingLink(false)
                    return
                }
            }

            if (code && !accessToken) {
                const { error } = await supabase.auth.exchangeCodeForSession(code)
                if (error) {
                    if (active) setCheckingLink(false)
                    return
                }
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!active) return

            setSessionReady(Boolean(session))
            setCheckingLink(false)

            if (session && (window.location.hash || code)) {
                window.history.replaceState({}, '', window.location.pathname)
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!active || !session) return
            setSessionReady(true)
            setCheckingLink(false)
        })

        void prepareSession()

        return () => {
            active = false
            subscription.unsubscribe()
        }
    }, [supabase])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (password.length < 6) return toast.error('Usa al menos 6 caracteres.')
        if (password !== confirmation) return toast.error('Las contraseñas no coinciden.')

        setLoading(true)
        const { error } = await supabase.auth.updateUser({
            password,
            data: { password_set: true },
        })
        setLoading(false)

        if (error) return toast.error('No se pudo guardar la contraseña. Solicita un enlace nuevo.')

        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id)
            .maybeSingle()

        toast.success('Contraseña establecida correctamente')
        router.replace(getRoleHome(isAppRole(profile?.role) ? profile.role : null))
        router.refresh()
    }

    if (checkingLink) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-navy p-4">
                <Card className="w-full max-w-md border-white/10 shadow-2xl">
                    <CardContent className="flex items-center justify-center gap-3 py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-gold" />
                        <p>Comprobando el enlace seguro…</p>
                    </CardContent>
                </Card>
            </main>
        )
    }

    if (!sessionReady) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-navy p-4">
                <Card className="w-full max-w-md border-white/10 shadow-2xl">
                    <CardHeader className="text-center">
                        <KeyRound className="mx-auto mb-3 h-10 w-10 text-gold" />
                        <CardTitle className="text-2xl">El enlace no es válido</CardTitle>
                        <CardDescription>Puede que haya caducado o ya se haya utilizado. Solicita uno nuevo desde el acceso.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full bg-gold text-navy" onClick={() => router.replace('/portal')}>
                            Volver y solicitar un enlace nuevo
                        </Button>
                    </CardContent>
                </Card>
            </main>
        )
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
                            <Input id="password" type="password" minLength={6} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmation">Repite la contraseña</Label>
                            <Input id="confirmation" type="password" minLength={6} autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
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
