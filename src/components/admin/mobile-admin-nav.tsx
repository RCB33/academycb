'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
    Activity, Briefcase, CalendarDays, ChevronUp, CreditCard, FileText,
    LayoutDashboard, MessageCircle, MessageSquare, MessageSquareHeart,
    MoreHorizontal, Settings, ShoppingBag, Trophy, TrendingUp, UserPlus,
    Users, Video,
} from 'lucide-react'

type Item = { href: string, label: string, icon: ReactNode }
type Group = { label: string, items: Item[] }

function isActiveSection(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
}

function MenuLink({ item, active, onNavigate }: { item: Item, active?: boolean, onNavigate?: () => void }) {
    return <Link href={item.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all ${active ? 'bg-gold text-navy shadow-lg shadow-black/20' : 'text-slate-100 active:bg-white/10'}`}>
        <span className={active ? 'text-navy' : 'text-gold'}>{item.icon}</span><span>{item.label}</span>
    </Link>
}

export function MobileAdminNav({ isAdmin, isStaff, isFinance, isMarketing }: { isAdmin: boolean, isStaff: boolean, isFinance: boolean, isMarketing: boolean }) {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    useEffect(() => setOpen(false), [pathname])

    const primary: Item[] = isAdmin ? [
        { href: '/admin/dashboard', label: 'Inicio', icon: <LayoutDashboard className="h-5 w-5" /> },
        { href: '/admin/crm/alumnos', label: 'Jugadores', icon: <Users className="h-5 w-5" /> },
        { href: '/admin/calendario', label: 'Calendario', icon: <CalendarDays className="h-5 w-5" /> },
        { href: '/admin/muro', label: 'Muro', icon: <MessageSquareHeart className="h-5 w-5" /> },
    ] : isStaff ? [{ href: '/admin/calendario', label: 'Calendario', icon: <CalendarDays className="h-5 w-5" /> }]
        : isFinance ? [{ href: '/admin/finanzas', label: 'Finanzas', icon: <CreditCard className="h-5 w-5" /> }]
            : [{ href: '/admin/leads', label: 'Solicitudes', icon: <MessageSquare className="h-5 w-5" /> }]

    const groups: Group[] = [
        ...(isAdmin || isMarketing ? [{ label: isMarketing ? 'Marketing' : 'Gestión CRM', items: [
            ...(isAdmin ? [
                { href: '/admin/seguimiento', label: 'Seguimiento', icon: <TrendingUp className="h-5 w-5" /> },
                { href: '/admin/crm/tutores', label: 'Tutores', icon: <UserPlus className="h-5 w-5" /> },
                { href: '/admin/crm/trabajadores', label: 'Trabajadores', icon: <Briefcase className="h-5 w-5" /> },
            ] : []),
            { href: '/admin/leads', label: 'Solicitudes web', icon: <MessageSquare className="h-5 w-5" /> },
        ] }] : []),
        ...(isAdmin ? [{ label: 'Operativa', items: [
            { href: '/admin/academia', label: 'Academia', icon: <Activity className="h-5 w-5" /> },
            { href: '/admin/campus', label: 'Campus', icon: <FileText className="h-5 w-5" /> },
            { href: '/admin/torneos', label: 'Torneos', icon: <Trophy className="h-5 w-5" /> },
            { href: '/admin/videoteca', label: 'Videoteca', icon: <Video className="h-5 w-5" /> },
            { href: '/admin/tienda', label: 'Tienda', icon: <ShoppingBag className="h-5 w-5" /> },
        ] }] : []),
        ...(isAdmin ? [{ label: 'Comunicación', items: [
            { href: '/admin/comunicados', label: 'Comunicados', icon: <MessageCircle className="h-5 w-5" /> },
            { href: '/admin/settings/whatsapp', label: 'WhatsApp', icon: <Settings className="h-5 w-5" /> },
        ] }] : []),
        ...(isAdmin || isFinance ? [{ label: 'Gestión', items: [
            { href: '/admin/finanzas', label: 'Finanzas', icon: <CreditCard className="h-5 w-5" /> },
            ...(isAdmin ? [{ href: '/admin/ajustes', label: 'Ajustes', icon: <Settings className="h-5 w-5" /> }] : []),
        ] }] : []),
    ]
    const isMoreActive = groups.some((group) => group.items.some((item) => isActiveSection(pathname, item.href)))

    return <div className="md:hidden">
        {open && <>
            <button aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-navy/35 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
            <section aria-label="Más secciones" className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-50 max-h-[min(68dvh,38rem)] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/15 bg-navy px-4 pb-4 pt-3 text-white shadow-[0_-16px_50px_rgba(12,34,65,0.28)]">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/35" />
                <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-black tracking-wide">Más secciones</h2><button type="button" onClick={() => setOpen(false)} className="flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gold"><ChevronUp className="h-4 w-4" />Cerrar</button></div>
                <div className="space-y-4">{groups.map((group) => <div key={group.label} className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0"><p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-gold">{group.label}</p>{group.items.map((item) => <MenuLink key={item.href} item={item} active={isActiveSection(pathname, item.href)} onNavigate={() => setOpen(false)} />)}</div>)}</div>
            </section>
        </>}
        <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 flex min-h-[4.65rem] items-stretch border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-6px_20px_rgba(12,34,65,0.10)] backdrop-blur">
            {primary.map((item) => {
                const active = isActiveSection(pathname, item.href)
                return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`my-1 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition-all ${active ? 'bg-gold text-navy shadow-md shadow-gold/30' : 'text-slate-500 active:bg-slate-100'}`}><span className={active ? 'text-navy' : ''}>{item.icon}</span><span className="truncate">{item.label}</span></Link>
            })}
            <button type="button" aria-expanded={open} aria-current={isMoreActive ? 'page' : undefined} onClick={() => setOpen((value) => !value)} className={`my-1 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition-all ${open || isMoreActive ? 'bg-gold text-navy shadow-md shadow-gold/30' : 'text-slate-500 active:bg-slate-100'}`}><MoreHorizontal className="h-5 w-5" /><span>Más</span></button>
        </nav>
    </div>
}
