'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createRecoveryClient } from '@/lib/supabase/recovery-client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { getRoleHome, isAppRole } from '@/lib/roles'

export function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [resettingPassword, setResettingPassword] = useState(false)
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const recoveryClient = useMemo(() => createRecoveryClient(), [])

    useEffect(() => {
        const isPasswordLink = (type: string | null) => type === 'invite' || type === 'recovery'
        const redirectPasswordLink = () => {
            const currentType = new URLSearchParams(window.location.hash.slice(1)).get('type')
            if (!isPasswordLink(currentType)) return false

            router.replace(`/portal/establecer-contrasena${window.location.hash}`)
            return true
        }

        if (redirectPasswordLink()) return

        window.addEventListener('hashchange', redirectPasswordLink)

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const needsInitialPassword = session?.user.user_metadata?.password_set !== true

            if (event === 'PASSWORD_RECOVERY' || (session && needsInitialPassword)) {
                router.replace('/portal/establecer-contrasena')
            }
        })

        return () => {
            window.removeEventListener('hashchange', redirectPasswordLink)
            subscription.unsubscribe()
        }
    }, [router, supabase])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            if (error) {
                toast.error("Error al iniciar sesión: " + error.message)
            } else {
                // Check role
                const { data: { user } } = await supabase.auth.getUser()
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user?.id)
                    .single()

                toast.success("Bienvenido")
                router.refresh()

                router.push(getRoleHome(isAppRole(profile?.role) ? profile.role : null))
            }
        } catch {
            toast.error("Ha ocurrido un error inesperado")
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordReset = async () => {
        const normalizedEmail = email.trim()
        if (!normalizedEmail) {
            toast.error('Escribe primero tu correo electrónico.')
            return
        }

        setResettingPassword(true)
        const redirectTo = `${window.location.origin}/portal/establecer-contrasena`
        const { error } = await recoveryClient.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
        setResettingPassword(false)

        if (error) {
            toast.error('No se pudo enviar el enlace. Inténtalo de nuevo en unos minutos.')
            return
        }

        toast.success('Te hemos enviado un enlace para crear o recuperar tu contraseña.')
    }

    return (
        <Card className="!bg-white/10 backdrop-blur-lg !border-white/20 shadow-2xl">
            <CardContent className="pt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-primary"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-white">Contraseña</Label>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-primary"
                        />
                    </div>
                    <Button type="submit" className="w-full font-bold" style={{ backgroundColor: '#D4AF37', color: '#0C2241' }} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Entrar
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2 border-t border-white/10 p-4 text-center">
                <p className="text-xs text-gray-300">¿Primera vez o has olvidado la contraseña?</p>
                <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm font-semibold text-primary"
                    onClick={handlePasswordReset}
                    disabled={loading || resettingPassword}
                >
                    {resettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear o recuperar contraseña
                </Button>
            </CardFooter>
        </Card>
    )
}
