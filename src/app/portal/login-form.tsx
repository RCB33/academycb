'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
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

                if (profile?.role === 'admin' || user?.email === 'rokecordoba@gmail.com') {
                    router.push('/admin/dashboard')
                } else {
                    router.push('/portal/dashboard')
                }
            }
        } catch (err) {
            toast.error("Ha ocurrido un error inesperado")
        } finally {
            setLoading(false)
        }
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
                            <a href="#" className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</a>
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
            <CardFooter className="justify-center border-t border-white/10 p-4">
                <p className="text-xs text-gray-300">
                    ¿No tienes cuenta? Contacta con administración.
                </p>
            </CardFooter>
        </Card>
    )
}
