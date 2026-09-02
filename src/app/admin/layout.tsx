import Link from 'next/link'
import { LayoutDashboard, Users, UserPlus, Activity, CreditCard, Settings, FileText, LogOut, Trophy, ShoppingBag, Briefcase, MessageSquare, CalendarDays, Video, MessageCircle, TrendingUp, MessageSquareHeart } from "lucide-react"
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SearchCommand } from "@/components/admin/search-command"
import { NotificationBell } from "@/components/ui/notification-bell"
import { getRoleHome, getRoleLabel, isAppRole } from '@/lib/roles'
import { MobileAdminNav } from '@/components/admin/mobile-admin-nav'

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
            {/* Sidebar */}
            <aside className="hidden w-64 shrink-0 flex-col bg-navy text-white shadow-xl transition-all duration-300 md:flex md:h-screen md:w-64">
                <div className="p-6 border-b border-navy-light flex items-center justify-between bg-navy-dark/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold tracking-wider text-white">ACADEMY</h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                            {getRoleLabel(role)}
                        </p>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    {/* Dashboard */}
                    {isAdmin && <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            General
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
                        </div>
                    </div>}

                    {/* CRM */}
                    {(isAdmin || isMarketing) && <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            {isMarketing ? 'Marketing' : 'Gestión CRM'}
                        </div>
                        <div className="space-y-1">
                            {isAdmin && <NavItem href="/admin/crm/alumnos" icon={<Users size={18} />} label="Jugadores 360º" />}
                            {isAdmin && <NavItem href="/admin/seguimiento" icon={<TrendingUp size={18} />} label="Seguimiento" />}
                            <NavItem href="/admin/leads" icon={<MessageSquare size={18} />} label="Solicitudes Web" />
                            {isAdmin && <NavItem href="/admin/crm/tutores" icon={<UserPlus size={18} />} label="Tutores" />}
                            {isAdmin && <NavItem href="/admin/crm/trabajadores" icon={<Briefcase size={18} />} label="Trabajadores" />}
                        </div>
                    </div>}

                    {/* BUSINESS LINES */}
                    {(isAdmin || isStaff) && <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            Operativa
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/calendario" icon={<CalendarDays size={18} />} label="Calendario General" />
                            {isAdmin && <>
                                <NavItem href="/admin/videoteca" icon={<Video size={18} />} label="Videoteca" />
                                <NavItem href="/admin/academia" icon={<Activity size={18} />} label="Academia" />
                                <NavItem href="/admin/campus" icon={<FileText size={18} />} label="Campus" />
                                <NavItem href="/admin/torneos" icon={<Trophy size={18} />} label="Torneos" />
                                <NavItem href="/admin/tienda" icon={<ShoppingBag size={18} />} label="Tienda" />
                            </>}
                        </div>
                    </div>}

                    {/* COMMUNICATION */}
                    {isAdmin && <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            Comunicación
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/comunicados" icon={<MessageCircle size={18} />} label="Comunicados" />
                            <NavItem href="/admin/muro" icon={<MessageSquareHeart size={18} />} label="Muro Academy" />
                            <NavItem href="/admin/settings/whatsapp" icon={<Settings size={18} />} label="Configuración API" />
                        </div>
                    </div>}

                    {/* FINANCE */}
                    {(isAdmin || isFinance) && <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            {isFinance ? 'Finanzas' : 'Sistema'}
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/finanzas" icon={<CreditCard size={18} />} label="Finanzas" />
                            {isAdmin && <NavItem href="/admin/ajustes" icon={<Settings size={18} />} label="Ajustes" />}
                        </div>
                    </div>}
                </nav>
                <div className="p-4 border-t border-navy-light bg-navy-dark/30 shrink-0 mt-auto">
                    <form action={signOut}>
                        <button className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors w-full text-sm font-medium">
                            <LogOut size={16} /> <span>Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            </aside>

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
                        <div className="flex flex-col items-end hidden sm:flex">
                            <span className="text-sm font-semibold text-slate-900 leading-none">{user.email?.split('@')[0]}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{getRoleLabel(role)}</span>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-indigo-100 shrink-0">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
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

function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
        <Link href={href} className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-navy-light/50 transition-all text-gray-300 hover:text-white text-sm font-medium group border border-transparent hover:border-white/5">
            <span className="group-hover:scale-110 transition-transform duration-200">
                {icon}
            </span>
            <span>{label}</span>
        </Link>
    )
}
