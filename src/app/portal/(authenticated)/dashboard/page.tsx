import { getPortalViewer } from '@/lib/admin-view'

import { PlayerProfileDetails } from '@/components/portal/player-profile-details'
import { PlayerPhotoEditor } from '@/components/portal/player-photo-editor'
import { getT } from '@/lib/i18n/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, UsersRound } from "lucide-react"

export default async function DashboardPage() {
    const translate = await getT()

    const { supabase, user, view } = await getPortalViewer()

    // Get Guardian ID
    const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user?.id)
        .single()

    if (!guardian) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-4">{translate("Cuenta no vinculada")}</h2>
                <p className="text-muted-foreground">{translate("Tu usuario no está asociado a ningún tutor. Contacta con la academia.")}</p>
            </div>
        )
    }

    // Get Children
    const { data: relations } = await supabase
        .from('child_guardians')
        .select('child:children(id, full_name, birth_year, birth_date, club_name, club_category, club_division, avatar_url, archived_at)')
        .eq('guardian_id', guardian.id)

    const children = (relations?.map(r => r.child) || []).filter((child: any) => child && !child.archived_at)

    if (children.length === 1) {
        redirect(`/portal/${(children[0] as any).id}`)
    }

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 rounded-3xl border border-gold/20 bg-gradient-to-br from-navy to-navy/90 p-6 text-white shadow-lg sm:p-8">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gold text-navy">
                    <UsersRound className="h-6 w-6" />
                </div>
                <h1 className="font-heading text-3xl font-black tracking-tight">{translate("Mis jugadores")}</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">{translate("Elige la ficha que quieres consultar. Podrás cambiar de jugador en cualquier momento desde el selector del portal.")}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {translate(children.map((child: any) => (
                    <Card key={child.id} className="group border-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <PlayerPhotoEditor childId={child.id} name={child.full_name} avatarUrl={child.avatar_url} />
                            <div>
                                <CardTitle className="text-xl">{translate(child.full_name)}</CardTitle>

                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <PlayerProfileDetails player={child} editable compact />
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>{translate("Progreso, calendario y documentos")}</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/portal/${child.id}`} className="w-full">
                                <Button className="w-full">{translate("Ver Ficha de Jugador")}</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                )))}

                {translate(children.length === 0 && (
                    <Card className="col-span-full p-8 text-center bg-muted/50 border-dashed">
                        <p className="text-muted-foreground">{translate("No hay alumnos asociados a tu cuenta.")}</p>
                    </Card>
                ))}
            </div>
        </div>
    )
}
