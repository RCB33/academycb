import Link from 'next/link'
import { LogOut } from "lucide-react"
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SearchCommand } from "@/components/admin/search-command"
import { NotificationBell } from "@/components/ui/notification-bell"
import { getRoleHome, getRoleLabel, isAppRole } from '@/lib/roles'
import { MobileAdminNav } from '@/components/admin/mobile-admin-nav'
import { AdminDesktopSidebar } from '@/components/admin/admin-desktop-sidebar'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createServerClient()
    // Double check user in layout just in case
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/portal')

    // Fetch profile to check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = isAppRole(profile?.role) ? profile.role : null
    if (!role || !['admin', 'staff', 'finance', 'marketing'].includes(role)) {
        redirect(getRoleHome(role))
    }

    const isAdmin = role === 'admin'
    const isStaff = role === 'staff'
    const isFinance = role === 'finance'
    const isMarketing = role === 'marketing'

    const signOut = async () => {
        'use server'
        const sb = await createServerClient()
        await sb.auth.signOut()
        redirect('/')
    }

    return (
        <div className="flex h-[100dvh] w-full flex-1 flex-col overflow-hidden bg-slate-50 md:h-screen md:flex-row">
            <MobileAdminNav isAdmin={isAdmin} isStaff={isStaff} isFinance={isFinance} isMarketing={isMarketing} />
            <AdminDesktopSidebar isAdmin={isAdmin} isStaff={isStaff} isFinance={isFinance} isMarketing={isMarketing} roleLabel={getRoleLabel(role)} signOut={signOut} />

            {/* Main Content Area */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50 md:h-screen">
                {/* Top Header */}
                <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b bg-white/80 px-4 shadow-sm backdrop-blur-md transition-all md:px-8">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col md:hidden">
                            <span className="text-base font-black tracking-wide text-navy">ACADEMY</span>
                            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{getRoleLabel(role)}</span>
                        </div>
                        <div className="hidden md:block">{isAdmin && <SearchCommand />}</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <Link href="/cuenta" className="hidden flex-col items-end rounded-lg px-2 py-1 transition hover:bg-slate-100 sm:flex" title="Mi cuenta">
                            <span className="text-sm font-semibold text-slate-900 leading-none">{user.email?.split('@')[0]}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{getRoleLabel(role)}</span>
                        </Link>
                        <Link href="/cuenta" title="Mi cuenta" aria-label="Mi cuenta" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-xs font-black text-navy shadow-sm ring-2 ring-gold/20 transition hover:scale-105">
                            {user.email?.charAt(0).toUpperCase()}
                        </Link>
                        <form action={signOut}>
                            <button title="Cerrar Sesión" className="h-9 w-9 ml-2 rounded-full hover:bg-slate-100 flex items-center justify-center text-red-500 hover:text-red-600 transition-colors">
                                <LogOut size={18} />
                            </button>
                        </form>
                    </div>
                </header>

                <main className="relative h-full flex-1 overflow-x-hidden overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8">
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                    {/* Add some padding space at the very bottom strictly to prevent cut-offs */}
                    <div className="h-2 w-full shrink-0 md:h-8" />
                </main>
            </div>
        </div>
    )
}
