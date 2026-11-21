'use client'
import { useT, useLocale } from '@/lib/i18n/client'
import Link from 'next/link'


import { useEffect, useMemo, useRef, useState } from 'react'
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
import { PortalEntryLoading } from '@/components/portal/portal-entry-loading'
import { portalReturnPath } from '@/lib/portal-return'

export function LoginForm() {
    const translate = useT()
    const locale = useLocale()
    const codeText = { es: { have: 'Tengo un código de bienvenida', request: 'Enviar código para crear o recuperar contraseña', sent: 'Si el email tiene una cuenta, recibirá un código. Revisa también spam.', failed: 'No se pudo enviar el código. Inténtalo de nuevo en unos minutos.' }, ca: { have: 'Tinc un codi de benvinguda', request: 'Enviar codi per crear o recuperar la contrasenya', sent: 'Si l’email té un compte, rebrà un codi. Revisa també el correu brossa.', failed: 'No s’ha pogut enviar el codi. Torna-ho a provar d’aquí a uns minuts.' }, en: { have: 'I have a welcome code', request: 'Send a code to create or reset my password', sent: 'If the email has an account, it will receive a code. Check your spam folder too.', failed: 'The code could not be sent. Try again in a few minutes.' } }[locale]

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [entering, setEntering] = useState(false)
    const loginInFlight = useRef(false)
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
        if (loginInFlight.current) return
        loginInFlight.current = true
        setEntering(false)
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            if (error) {
                toast.error(translate("Error al iniciar sesión: ") + translate(error.message))
                loginInFlight.current = false
                setLoading(false)
            } else {
                setEntering(true)
                // Keep the transition visible while the destination loads.
                // Check role
                const { data: { user } } = await supabase.auth.getUser()
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user?.id)
                    .single()

                router.refresh()

                const next=profile?.role==='guardian'?portalReturnPath(new URLSearchParams(window.location.search).get('next')):null
                router.push(next||getRoleHome(isAppRole(profile?.role) ? profile.role : null))
            }
        } catch {
            toast.error(translate("Ha ocurrido un error inesperado"))
            loginInFlight.current = false
            setLoading(false)
        }
    }

    const handlePasswordReset = async () => {
        if (resettingPassword) return
        const normalizedEmail = email.trim()
        if (!normalizedEmail) {
            toast.error(translate('Escribe primero tu correo electrónico.'))
            return
        }

        setResettingPassword(true)
        try {
        const redirectTo = `${window.location.origin}/portal/codigo?type=recovery`
        const { error } = await recoveryClient.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })

        if (error) {
            toast.error(codeText.failed)
            return
        }

        try { sessionStorage.setItem('academy-access-email', normalizedEmail) } catch {}
        toast.success(codeText.sent)
        const next = portalReturnPath(new URLSearchParams(window.location.search).get('next'))
        router.push('/portal/codigo?type=recovery' + (next ? '&next=' + encodeURIComponent(next) : ''))
        } catch { toast.error(codeText.failed) }
        finally { setResettingPassword(false) }
    }

    if (loading) return <PortalEntryLoading checking={!entering} />

    return (
        <Card className="!bg-white/10 backdrop-blur-lg !border-white/20 shadow-2xl">
            <CardContent className="pt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">{translate("Email")}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={translate("tu@email.com")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-primary"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-white">{translate("Contraseña")}</Label>
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
                        {translate(loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null)}
                        {translate("Entrar")}</Button>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2 border-t border-white/10 p-4 text-center">
                <Link href="/portal/codigo?type=invite" className="mb-2 text-sm font-semibold text-gold underline">{codeText.have}</Link>
                <p className="text-xs text-gray-300">{translate("¿Primera vez o has olvidado la contraseña?")}</p>
                <Button
                    type="button"
                    variant="link"
                    className="h-auto whitespace-normal p-0 text-sm font-semibold text-primary"
                    onClick={handlePasswordReset}
                    disabled={loading || resettingPassword}
                >
                    {translate(resettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />)}
                    {codeText.request}</Button>
            </CardFooter>
        </Card>
    )
}
