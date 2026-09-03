import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/app/actions/profiles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PasswordForm } from "./password-form"
import Link from 'next/link'
import { CircleUserRound } from 'lucide-react'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const { data: guardian } = await supabase
        .from('guardians')
        .select(`
            phone,
            child_guardians(
                relationship,
                child:children(
                    full_name,
                    category:categories(name)
                )
            )
        `)
        .eq('user_id', user.id)
        .single()

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <header className="rounded-3xl bg-navy p-6 text-white shadow-lg"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold text-navy"><CircleUserRound className="h-6 w-6" /></span><h1 className="mt-4 font-heading text-3xl font-black uppercase">Mi perfil</h1><p className="mt-2 text-sm text-slate-300">Gestiona tus datos de contacto, contraseña y jugadores vinculados.</p></header>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profile?.avatar_url} />
                            <AvatarFallback className="text-2xl">
                                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{profile?.full_name || 'Nuevo Usuario'}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                            <div className="mt-2">
                                <Badge variant="secondary" className="capitalize">
                                    {profile?.role || 'Estudiante'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form action={updateProfile} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="full_name">Nombre Completo</Label>
                            <Input
                                id="full_name"
                                name="full_name"
                                defaultValue={profile?.full_name || ''}
                                placeholder="Tu nombre"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono de Contacto</Label>
                            <Input
                                id="phone"
                                name="phone"
                                defaultValue={guardian?.phone || ''}
                                placeholder="Tu número de teléfono"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                value={user.email}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                El correo electrónico no se puede cambiar desde aquí.
                            </p>
                        </div>
                        <Button type="submit" className="w-full bg-gold font-bold text-navy hover:bg-gold-light">
                            Guardar Cambios
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Jugadores Asignados</CardTitle>
                    <CardDescription>Alumnos bajo tu tutoría en la academia.</CardDescription>
                </CardHeader>
                <CardContent>
                    {(!guardian?.child_guardians || guardian.child_guardians.length === 0) ? (
                        <p className="text-sm text-slate-500">No tienes ningún jugador asignado.</p>
                    ) : (
                        <div className="space-y-3">
                            {guardian.child_guardians.map((cg: any, i: number) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-900">{cg.child?.full_name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{cg.child?.category?.name || 'Academia'} • {cg.relationship}</p>
                                    </div>
                                    <Badge variant="outline" className="bg-white">Asignado</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <PasswordForm />

            <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-navy">Ayuda con tu cuenta</CardTitle>
                    <CardDescription>
                        Para cambiar el correo o solicitar la eliminación de la cuenta, contacta con Academy.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">Secretaría comprobará tu identidad antes de realizar cambios sensibles.</p>
                </CardContent>
                <CardFooter className="rounded-b-2xl border-t bg-slate-50">
                    <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy hover:text-white"><Link href="/contacto">Contactar con Academy</Link></Button>
                </CardFooter>
            </Card>
        </div>
    )
}
