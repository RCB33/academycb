'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
    Activity, Briefcase, CalendarDays, ChevronLeft, ChevronRight, CreditCard,
    FileText, LayoutDashboard, LogOut, MessageCircle, MessageSquare,
    MessageSquareHeart, Settings, ShoppingBag, Trophy, TrendingUp, UserPlus,
    UserRound, Users, Video,
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
                { href: '/admin/familias', label: 'Uso del Portal Familias', icon: <Users size={19} /> },
                { href: '/admin/crm/trabajadores', label: 'Trabajadores', icon: <Briefcase size={19} /> },
            ] : []),
        ] }] : []),
        ...(isAdmin || isStaff ? [{ label: 'Operativa', items: [
            { href: '/admin/calendario', label: 'Calendario general', icon: <CalendarDays size={19} /> },
            ...(isAdmin ? [
                { href: '/admin/videoteca', label: 'Videoteca', icon: <Video size={19} /> },
                { href: '/admin/gestion', label: 'Gestión de Academia', icon: <Activity size={19} /> },
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
            ...(isAdmin ? [{ href: '/admin/stripe', label: 'Conexión Stripe', icon: <CreditCard size={19} /> }] : []),
            ...(isAdmin ? [{ href: '/admin/ajustes', label: 'Ajustes', icon: <Settings size={19} /> }] : []),
        ] }] : []),
    ]

    const menu = isAdmin ? [
        {label:'Principal',items:[
            {href:'/admin/dashboard',label:'Inicio',icon:<LayoutDashboard size={19}/>},
            {href:'/admin/crm/alumnos',label:'Jugadores',icon:<Users size={19}/>},
            {href:'/admin/solicitudes',label:'Solicitudes',icon:<MessageSquare size={19}/>},
            {href:'/admin/gestion',label:'Gestión de Academia',icon:<Activity size={19}/>},
            {href:'/admin/finanzas',label:'Cobros y finanzas',icon:<CreditCard size={19}/>},
            {href:'/admin/crm/trabajadores',label:'Trabajadores',icon:<Briefcase size={19}/>},
        ]},
        {label:'Más herramientas',items:groups.flatMap(g=>g.items).filter(i=>!['/admin/dashboard','/admin/crm/alumnos','/admin/solicitudes','/admin/gestion','/admin/finanzas','/admin/crm/trabajadores'].includes(i.href)).map(i=>i.href==='/admin/leads'?{...i,label:'Consultas comerciales'}:i)},
    ] : groups
    return <aside className={`group/sidebar hidden shrink-0 flex-col bg-navy text-white shadow-xl transition-[width] duration-300 md:flex md:h-screen ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className={`flex h-[5.5rem] shrink-0 items-center border-b border-navy-light bg-navy-dark/50 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
            <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3">
                <Image src="/logo-academy.png" width={44} height={44} alt="Academy Costa Brava" className="h-11 w-11 shrink-0 object-contain"/>
                {!collapsed&&<span><span className="block text-lg font-bold tracking-wider">ACADEMY</span><span className="text-[9px] uppercase tracking-[.18em] text-gold">Costa Brava</span></span>}
            </Link>
            {!collapsed && <button type="button" title="Contraer menú" aria-label="Contraer menú" onClick={() => setCollapsed(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"><ChevronLeft size={18} /></button>}
        </div>
        {collapsed && <button type="button" title="Desplegar menú" aria-label="Desplegar menú" onClick={() => setCollapsed(false)} className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gold transition-colors hover:bg-white/10"><ChevronRight size={19} /></button>}
        <nav aria-label="Menú de gestión" className={`flex-1 space-y-5 overflow-x-hidden overflow-y-auto scrollbar-hide ${collapsed ? 'px-2 py-4' : 'p-4'}`}>
            {menu.map((group) => {
                const links=<div className="space-y-1">{group.items.map(item=>{const active=isActiveSection(pathname,item.href);return <Link key={item.href} href={item.href} title={collapsed?item.label:undefined} aria-current={active?'page':undefined} className={`flex min-h-11 items-center rounded-xl text-sm font-medium transition-all ${collapsed?'justify-center px-2':'gap-3 px-3'} ${active?'bg-gold text-navy shadow-md shadow-black/15':'text-slate-300 hover:bg-white/10 hover:text-white'}`}>{item.icon}{!collapsed&&<span className="truncate">{item.label}</span>}</Link>})}</div>
                return group.label==='Más herramientas'?<details key={group.label} open={group.items.some(i=>isActiveSection(pathname,i.href))||undefined} className="border-t border-white/10 pt-4"><summary title="Más herramientas" className="mb-3 cursor-pointer px-2 text-xs font-semibold text-slate-400">{collapsed?'•••':'Más herramientas'}</summary>{links}</details>:<div key={group.label}>{!collapsed&&group.label!=='Principal'&&<p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gold">{group.label}</p>}{links}</div>
            })}
        </nav>
        <div className={`shrink-0 border-t border-navy-light bg-navy-dark/30 ${collapsed ? 'p-2' : 'p-4'}`}>
            <Link href="/cuenta" title="Mi cuenta" className={`mb-1 flex min-h-10 items-center rounded-lg text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}>
                <UserRound size={18} />{!collapsed && <span>Mi cuenta</span>}
            </Link>
            <form action={signOut}>
                <button title="Cerrar sesión" className={`flex min-h-10 items-center rounded-lg text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? 'w-full justify-center px-2' : 'w-full gap-3 px-3'}`}>
                    <LogOut size={18} />{!collapsed && <span>Cerrar sesión</span>}
                </button>
            </form>
        </div>
    </aside>
}
