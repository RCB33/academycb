import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/ui/notification-bell"
import { GlobalSignatureGuard } from "@/components/portal/global-signature-guard"
import { MobilePortalNav, SidebarNav } from "@/components/portal/sidebar-nav"
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

    const signOut = async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/')
    }

    return (
        <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-muted/20 md:h-screen md:min-h-0 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="flex shrink-0 items-center justify-between border-b bg-background p-4 md:hidden">
                <Link href="/portal/dashboard" className="flex items-center space-x-2 font-bold">
                    <Trophy className="h-5 w-5 text-primary" />
                    <span>Portal</span>
                </Link>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <form action={signOut}>
                        <Button variant="ghost" size="icon"><LogOut className="h-5 w-5" /></Button>
                    </form>
                </div>
            </div>
            <MobilePortalNav />

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen shrink-0 relative z-20">
                <div className="p-6 border-b shrink-0">
                    <Link href="/portal/dashboard" className="flex items-center space-x-2 font-bold text-xl">
                        <Trophy className="h-6 w-6 text-primary" />
                        <span>Portal Familias</span>
                    </Link>
                </div>
                <SidebarNav />
                <div className="p-4 border-t shrink-0">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.email}</p>
                            </div>
                        </div>
                        <NotificationBell />
                    </div>
                    <form action={signOut}>
                        <Button variant="outline" className="w-full">
                            <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                        </Button>
                    </form>
                </div>
            </aside>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-screen">
                <main className="relative h-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] md:p-8">
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
