import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, UserCircle, UsersRound } from "lucide-react"

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
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 rounded-3xl border border-gold/20 bg-gradient-to-br from-navy to-navy/90 p-6 text-white shadow-lg sm:p-8">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gold text-navy">
                    <UsersRound className="h-6 w-6" />
                </div>
                <h1 className="font-heading text-3xl font-black tracking-tight">Mis jugadores</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">Elige la ficha que quieres consultar. Podrás cambiar de jugador en cualquier momento desde el selector del portal.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {children.map((child: any) => (
                    <Card key={child.id} className="group border-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg">
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
                                <span>Progreso, calendario y documentos</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
