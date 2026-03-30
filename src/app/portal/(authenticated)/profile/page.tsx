import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/app/actions/profiles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PasswordForm } from "./password-form"

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
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>

            <Card>
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
                        <Button type="submit" className="w-full">
                            Guardar Cambios
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
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

            <Card className="border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                    <CardDescription>
                        Acciones que afectan a tu cuenta de forma permanente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Si deseas cerrar tu cuenta o tienes problemas con tus datos, contacta con el administrador.
                    </p>
                </CardContent>
                <CardFooter className="bg-destructive/5 rounded-b-lg border-t border-destructive/10">
                    <Button variant="outline" className="text-destructive hover:bg-destructive hover:text-white" disabled>
                        Eliminar Cuenta
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
