import Link from 'next/link'
import { ArrowLeft, CircleUserRound, Mail, ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PasswordForm } from '@/app/portal/(authenticated)/profile/password-form'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getRoleHome, getRoleLabel, isAppRole } from '@/lib/roles'

export default async function AccountPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/portal')

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle()
    const role = isAppRole(profile?.role) ? profile.role : null

    return (
        <main className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-2xl space-y-6">
                <header className="rounded-3xl bg-navy p-6 text-white shadow-lg sm:p-8">
                    <Link href={getRoleHome(role)} className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Link>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-navy">
                        <CircleUserRound className="h-6 w-6" />
                    </span>
                    <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-gold">Seguridad de la cuenta</p>
                    <h1 className="mt-1 font-heading text-3xl font-black uppercase sm:text-4xl">Mi cuenta</h1>
                    <p className="mt-2 text-sm text-slate-300">Gestiona de forma segura tus datos de acceso a Academy.</p>
                </header>

                <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                            <Mail className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-navy">{profile?.full_name || user.email}</p>
                            <p className="truncate text-sm text-slate-500">{user.email}</p>
                        </div>
                        <Badge className="shrink-0 bg-navy text-white hover:bg-navy">{getRoleLabel(role)}</Badge>
                    </CardContent>
                </Card>

                <PasswordForm />

                <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>Cuando cambies la contraseña recibirás un correo automático de seguridad. Academy nunca puede ver tu contraseña.</p>
                </div>
            </div>
        </main>
    )
}
