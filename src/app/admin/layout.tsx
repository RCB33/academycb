import Link from 'next/link'
import { LayoutDashboard, Users, UserPlus, Activity, CreditCard, Settings, FileText, LogOut, Trophy, ShoppingBag, Briefcase, MessageSquare, CalendarDays, Video, MessageCircle, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SearchCommand } from "@/components/admin/search-command"
import { NotificationBell } from "@/components/ui/notification-bell"

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

    if (profile?.role !== 'admin') {
        redirect('/portal')
    }

    const signOut = async () => {
        'use server'
        const sb = await createServerClient()
        await sb.auth.signOut()
        redirect('/')
    }

    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden flex-1 w-full bg-slate-50">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-navy text-white flex flex-col h-auto md:h-screen shrink-0 transition-all duration-300 shadow-xl z-20">
                <div className="p-6 border-b border-navy-light flex items-center justify-between bg-navy-dark/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold tracking-wider text-white">ACADEMY</h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Panel Admin</p>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
                    {/* Dashboard */}
                    <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            General
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
                        </div>
                    </div>

                    {/* CRM */}
                    <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            Gestión CRM
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/crm/alumnos" icon={<Users size={18} />} label="Alumnos 360º" />
                            <NavItem href="/admin/seguimiento" icon={<TrendingUp size={18} />} label="Seguimiento" />
                            <NavItem href="/admin/leads" icon={<MessageSquare size={18} />} label="Solicitudes Web" />
                            <NavItem href="/admin/crm/tutores" icon={<UserPlus size={18} />} label="Tutores" />
                            <NavItem href="/admin/crm/trabajadores" icon={<Briefcase size={18} />} label="Trabajadores" />
                        </div>
                    </div>

                    {/* BUSINESS LINES */}
                    <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            Operativa
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/calendario" icon={<CalendarDays size={18} />} label="Calendario General" />
                            <NavItem href="/admin/videoteca" icon={<Video size={18} />} label="Videoteca" />
                            <NavItem href="/admin/academia" icon={<Activity size={18} />} label="Academia" />
                            <NavItem href="/admin/campus" icon={<FileText size={18} />} label="Campus" />
                            <NavItem href="/admin/torneos" icon={<Trophy size={18} />} label="Torneos" />
                            <NavItem href="/admin/tienda" icon={<ShoppingBag size={18} />} label="Tienda" />
                        </div>
                    </div>

                    {/* COMMUNICATION */}
                    <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            Comunicación
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/comunicados" icon={<MessageCircle size={18} />} label="Comunicados" />
                            <NavItem href="/admin/settings/whatsapp" icon={<Settings size={18} />} label="Configuración API" />
                        </div>
                    </div>

                    {/* FINANCE */}
                    <div>
                        <div className="px-3 mb-2 text-[10px] font-bold text-gold uppercase tracking-widest opacity-80">
                            Sistema
                        </div>
                        <div className="space-y-1">
                            <NavItem href="/admin/finanzas" icon={<CreditCard size={18} />} label="Finanzas" />
                            <NavItem href="/admin/ajustes" icon={<Settings size={18} />} label="Ajustes" />
                        </div>
                    </div>
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
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-16 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 relative z-10 transition-all shadow-sm">
                    <div className="flex items-center gap-6">
                        <SearchCommand />
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <div className="flex flex-col items-end hidden sm:flex">
                            <span className="text-sm font-semibold text-slate-900 leading-none">{user.email?.split('@')[0]}</span>
                            <span className="text-[10px] text-slate-500 font-medium">Administrator</span>
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

                <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden relative h-full">
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                    {/* Add some padding space at the very bottom strictly to prevent cut-offs */}
                    <div className="h-8 shrink-0 w-full" />
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
