import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Need to create Avatar component or use placeholder
import { ArrowRight, UserCircle } from "lucide-react"

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get Guardian ID
    const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user?.id)
        .single()

    if (!guardian) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-4">Cuenta no vinculada</h2>
                <p className="text-muted-foreground">Tu usuario no está asociado a ningún tutor. Contacta con la academia.</p>
            </div>
        )
    }

    // Get Children
    const { data: relations } = await supabase
        .from('child_guardians')
        .select('child:children(id, full_name, birth_year, category:categories(name))')
        .eq('guardian_id', guardian.id)

    const children = relations?.map(r => r.child) || []

    if (children.length === 1) {
        redirect(`/portal/${(children[0] as any).id}`)
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Hola, Familia 👋</h1>
            <p className="text-muted-foreground mb-8">Selecciona un jugador para ver su progreso.</p>

            <div className="grid md:grid-cols-2 gap-6">
                {children.map((child: any) => (
                    <Card key={child.id} className="hover:shadow-lg transition-all cursor-pointer border-primary/20">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <UserCircle className="h-10 w-10" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">{child.full_name}</CardTitle>
                                <CardDescription>Año {child.birth_year} • {child.category?.name || 'Sin Categoría'}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Ver estadísticas completas</span>
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/portal/${child.id}`} className="w-full">
                                <Button className="w-full">Ver Ficha de Jugador</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}

                {children.length === 0 && (
                    <Card className="col-span-full p-8 text-center bg-muted/50 border-dashed">
                        <p className="text-muted-foreground">No hay alumnos asociados a tu cuenta.</p>
                    </Card>
                )}
            </div>
        </div>
    )
}
