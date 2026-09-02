'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
    Activity, Briefcase, CalendarDays, ChevronLeft, ChevronRight, CreditCard,
    FileText, LayoutDashboard, LogOut, MessageCircle, MessageSquare,
    MessageSquareHeart, Settings, ShoppingBag, Trophy, TrendingUp, UserPlus,
    Users, Video,
} from 'lucide-react'

type Item = { href: string, label: string, icon: ReactNode }
type Group = { label: string, items: Item[] }

function isActiveSection(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminDesktopSidebar({
    isAdmin,
    isStaff,
    isFinance,
    isMarketing,
    roleLabel,
    signOut,
}: {
    isAdmin: boolean
    isStaff: boolean
    isFinance: boolean
    isMarketing: boolean
    roleLabel: string
    signOut: () => Promise<void>
}) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 1280px)')
        const syncForViewport = () => setCollapsed(!mediaQuery.matches)
        syncForViewport()
        mediaQuery.addEventListener('change', syncForViewport)
        return () => mediaQuery.removeEventListener('change', syncForViewport)
    }, [])

    const groups: Group[] = [
        ...(isAdmin ? [{ label: 'General', items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> }] }] : []),
        ...(isAdmin || isMarketing ? [{ label: isMarketing ? 'Marketing' : 'Gestión CRM', items: [
            ...(isAdmin ? [
                { href: '/admin/crm/alumnos', label: 'Jugadores 360º', icon: <Users size={19} /> },
                { href: '/admin/seguimiento', label: 'Seguimiento', icon: <TrendingUp size={19} /> },
            ] : []),
            { href: '/admin/leads', label: 'Solicitudes web', icon: <MessageSquare size={19} /> },
            ...(isAdmin ? [
                { href: '/admin/crm/tutores', label: 'Tutores', icon: <UserPlus size={19} /> },
                { href: '/admin/crm/trabajadores', label: 'Trabajadores', icon: <Briefcase size={19} /> },
            ] : []),
        ] }] : []),
        ...(isAdmin || isStaff ? [{ label: 'Operativa', items: [
            { href: '/admin/calendario', label: 'Calendario general', icon: <CalendarDays size={19} /> },
            ...(isAdmin ? [
                { href: '/admin/videoteca', label: 'Videoteca', icon: <Video size={19} /> },
                { href: '/admin/academia', label: 'Academia', icon: <Activity size={19} /> },
                { href: '/admin/campus', label: 'Campus', icon: <FileText size={19} /> },
                { href: '/admin/torneos', label: 'Torneos', icon: <Trophy size={19} /> },
                { href: '/admin/tienda', label: 'Tienda', icon: <ShoppingBag size={19} /> },
            ] : []),
        ] }] : []),
        ...(isAdmin ? [{ label: 'Comunicación', items: [
            { href: '/admin/comunicados', label: 'Comunicados', icon: <MessageCircle size={19} /> },
            { href: '/admin/muro', label: 'Muro Academy', icon: <MessageSquareHeart size={19} /> },
            { href: '/admin/settings/whatsapp', label: 'Configuración API', icon: <Settings size={19} /> },
        ] }] : []),
        ...(isAdmin || isFinance ? [{ label: isFinance ? 'Finanzas' : 'Sistema', items: [
            { href: '/admin/finanzas', label: 'Finanzas', icon: <CreditCard size={19} /> },
            ...(isAdmin ? [{ href: '/admin/ajustes', label: 'Ajustes', icon: <Settings size={19} /> }] : []),
        ] }] : []),
    ]

    return <aside className={`group/sidebar hidden shrink-0 flex-col bg-navy text-white shadow-xl transition-[width] duration-300 md:flex md:h-screen ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className={`flex h-[5.5rem] shrink-0 items-center border-b border-navy-light bg-navy-dark/50 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
            <div className={collapsed ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-sm font-black text-navy' : ''}>
                <h2 className={collapsed ? '' : 'text-xl font-bold tracking-wider text-white'}>{collapsed ? 'A' : 'ACADEMY'}</h2>
                {!collapsed && <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-400">{roleLabel}</p>}
            </div>
            {!collapsed && <button type="button" title="Contraer menú" aria-label="Contraer menú" onClick={() => setCollapsed(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"><ChevronLeft size={18} /></button>}
        </div>
        {collapsed && <button type="button" title="Desplegar menú" aria-label="Desplegar menú" onClick={() => setCollapsed(false)} className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gold transition-colors hover:bg-white/10"><ChevronRight size={19} /></button>}
        <nav aria-label="Menú de gestión" className={`flex-1 space-y-5 overflow-x-hidden overflow-y-auto scrollbar-hide ${collapsed ? 'px-2 py-4' : 'p-4'}`}>
            {groups.map((group) => <div key={group.label} className={collapsed ? 'border-t border-white/10 pt-3 first:border-t-0 first:pt-0' : ''}>
                {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gold opacity-80">{group.label}</p>}
                <div className="space-y-1">{group.items.map((item) => {
                    const active = isActiveSection(pathname, item.href)
                    return <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined} className={`flex min-h-10 items-center rounded-lg text-sm font-medium transition-all ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${active ? 'bg-gold text-navy shadow-md shadow-black/15' : 'text-slate-300 hover:bg-navy-light/50 hover:text-white'}`}>
                        <span className={active ? 'scale-105' : ''}>{item.icon}</span>{!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                })}</div>
            </div>)}
        </nav>
        <div className={`shrink-0 border-t border-navy-light bg-navy-dark/30 ${collapsed ? 'p-2' : 'p-4'}`}>
            <form action={signOut}>
                <button title="Cerrar sesión" className={`flex min-h-10 items-center rounded-lg text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? 'w-full justify-center px-2' : 'w-full gap-3 px-3'}`}>
                    <LogOut size={18} />{!collapsed && <span>Cerrar sesión</span>}
                </button>
            </form>
        </div>
    </aside>
}
