import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/ui/notification-bell"
import { GlobalSignatureGuard } from "@/components/portal/global-signature-guard"
import { MobilePortalNav, PortalDesktopSidebar } from "@/components/portal/sidebar-nav"
import { PortalPlayerSwitcher } from "@/components/portal/player-switcher"
import { getRoleHome, isAppRole } from '@/lib/roles'

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/portal')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    const role = isAppRole(profile?.role) ? profile.role : null
    if (role && role !== 'guardian') {
        redirect(getRoleHome(role))
    }

    const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: childRelations } = guardian
        ? await supabase
            .from('child_guardians')
            .select('child:children(id, full_name, birth_year)')
            .eq('guardian_id', guardian.id)
        : { data: [] }

    const familyPlayers = (childRelations || [])
        .map((relation: any) => relation.child)
        .filter(Boolean)

    const signOut = async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/')
    }

    return (
        <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-muted/20 md:h-screen md:min-h-0 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="shrink-0 border-b border-white/10 bg-navy text-white shadow-md md:hidden">
                <div className="flex min-h-16 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
                    <Link href="/portal/dashboard" className="flex items-center space-x-2 font-bold">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-navy"><Trophy className="h-5 w-5" /></span>
                        <span><span className="block font-heading text-base font-black uppercase tracking-wide">Academy</span><span className="block text-[9px] uppercase tracking-[0.16em] text-slate-300">Familias</span></span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <form action={signOut}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white"><LogOut className="h-5 w-5" /></Button>
                        </form>
                    </div>
                </div>
                <PortalPlayerSwitcher players={familyPlayers} variant="mobile" />
            </div>
            <MobilePortalNav />

            {/* Desktop Sidebar */}
            <PortalDesktopSidebar players={familyPlayers} userEmail={user.email || 'Familia'} signOut={signOut} />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-screen">
                <main className="relative h-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:p-6 xl:p-8">
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                    <div className="h-4 shrink-0 w-full md:h-8" />
                </main>
            </div>

            {/* Global Signature Check */}
            <GlobalSignatureGuard userId={user.id} />
        </div>
    )
}
