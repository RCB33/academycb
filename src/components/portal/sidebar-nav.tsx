'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, FileText, User, Download, ShoppingBag, Video, Store, MessageSquare, Heart, ShieldCheck, Trophy, X, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/ui/notification-bell'
import { PortalPlayerSwitcher } from '@/components/portal/player-switcher'

const NAV_ITEMS = [
    { href: '/portal/dashboard', label: 'Inicio', icon: Home },
    { href: '/portal/comunicados', label: 'Comunicados', icon: MessageSquare },
    { href: '/portal/muro', label: 'Muro Academy', icon: Heart },
    { href: '/portal/profile', label: 'Mi Perfil', icon: User },
    { href: '/portal/calendario', label: 'Mi Calendario', icon: CalendarIcon },
    { href: '/portal/videoteca', label: 'Videoteca', icon: Video },
    { href: '/portal/documentos', label: 'Documentos', icon: FileText },
    { href: '/portal/autorizaciones', label: 'Autorizaciones', icon: ShieldCheck },
    { href: '/portal/pagos', label: 'Pagos', icon: ShoppingBag },
    { href: '/portal/tienda', label: 'Tienda', icon: Store },
    { href: '/portal/descargas', label: 'Descargas', icon: Download },
]

const MOBILE_PRIMARY_ITEMS = NAV_ITEMS.filter((item) => [
    '/portal/dashboard', '/portal/comunicados', '/portal/muro', '/portal/calendario',
].includes(item.href))
const MOBILE_MORE_ITEMS = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_ITEMS.includes(item))

function isCurrent(pathname: string, href: string) {
    if (href === '/portal/dashboard' && /^\/portal\/[0-9a-f-]{36}$/i.test(pathname)) return true
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
    const pathname = usePathname()

    return (
        <nav className={cn('flex-1 space-y-1 overflow-y-auto', collapsed ? 'px-2 py-4' : 'p-4')}>
            {NAV_ITEMS.map((item) => {
                const active = isCurrent(pathname, item.href)
                const Icon = item.icon

                return <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 items-center rounded-xl text-sm font-semibold transition-all', collapsed ? 'justify-center px-2' : 'gap-3 px-3', active ? 'bg-gold text-navy shadow-md shadow-black/15' : 'text-slate-300 hover:bg-white/10 hover:text-white')}><Icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span className="truncate">{item.label}</span>}</Link>
            })}
        </nav>
    )
}

type FamilyPlayer = { id: string; full_name: string; birth_year?: number | null }

export function PortalDesktopSidebar({ players, userEmail, signOut }: { players: FamilyPlayer[]; userEmail: string; signOut: () => Promise<void> }) {
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 1280px)')
        const syncForViewport = () => setCollapsed(!mediaQuery.matches)
        syncForViewport()
        mediaQuery.addEventListener('change', syncForViewport)
        return () => mediaQuery.removeEventListener('change', syncForViewport)
    }, [])

    return <aside className={cn('group/sidebar relative z-20 hidden h-screen shrink-0 flex-col bg-navy text-white shadow-xl transition-[width] duration-300 md:flex', collapsed ? 'w-20' : 'w-64')}>
        <div className={cn('flex h-[5.5rem] shrink-0 items-center border-b border-white/10 bg-navy-dark/40', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
            <Link href="/portal/dashboard" className={cn('flex items-center font-bold', collapsed ? 'h-10 w-10 justify-center rounded-xl bg-gold text-navy' : 'gap-3')} title="Portal Familias">
                <Trophy className={cn('h-5 w-5 shrink-0', collapsed ? 'text-navy' : 'text-gold')} />
                {!collapsed && <span><span className="block font-heading text-lg font-black uppercase tracking-wide">Academy</span><span className="block text-[9px] uppercase tracking-[0.18em] text-slate-400">Portal familias</span></span>}
            </Link>
            {!collapsed && <button type="button" onClick={() => setCollapsed(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Contraer menú"><ChevronLeft className="h-5 w-5" /></button>}
        </div>
        {collapsed && <button type="button" onClick={() => setCollapsed(false)} className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gold transition hover:bg-white/10" aria-label="Desplegar menú"><ChevronRight className="h-5 w-5" /></button>}
        {!collapsed && <div className="px-4 pt-4"><PortalPlayerSwitcher players={players} /></div>}
        <SidebarNav collapsed={collapsed} />
        <div className={cn('shrink-0 border-t border-white/10 bg-navy-dark/30', collapsed ? 'p-2' : 'p-4')}>
            {!collapsed && <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-2"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-xs font-black text-navy">{userEmail.charAt(0).toUpperCase()}</div><p className="min-w-0 flex-1 truncate text-xs text-slate-200">{userEmail}</p><NotificationBell /></div>}
            <form action={signOut}><button className={cn('flex min-h-11 w-full items-center rounded-xl text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white', collapsed ? 'justify-center px-2' : 'gap-3 px-3')} title="Cerrar sesión"><LogOut className="h-[18px] w-[18px]" />{!collapsed && 'Cerrar sesión'}</button></form>
        </div>
    </aside>
}

export function MobilePortalNav() {
    const pathname = usePathname()
    const [moreOpen, setMoreOpen] = useState(false)
    const moreIsActive = MOBILE_MORE_ITEMS.some((item) => isCurrent(pathname, item.href))

    useEffect(() => setMoreOpen(false), [pathname])

    useEffect(() => {
        if (!moreOpen) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = previousOverflow }
    }, [moreOpen])

    useEffect(() => {
        if (!moreOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMoreOpen(false)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [moreOpen])

    return <>
        {moreOpen && <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-[1px]" onClick={() => setMoreOpen(false)} aria-hidden="true" />}
        {moreOpen && <section role="dialog" aria-modal="true" aria-label="Más secciones del portal" className="fixed inset-x-0 bottom-0 z-[60] max-h-[74dvh] overflow-y-auto rounded-t-[2rem] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-navy/15" />
            <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Portal Familias</p><h2 className="mt-1 font-heading text-2xl font-black uppercase text-navy">Más secciones</h2></div><button type="button" onClick={() => setMoreOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-navy" aria-label="Cerrar menú"><X className="h-5 w-5" /></button></div>
            <nav className="grid grid-cols-2 gap-3" aria-label="Más secciones">
                {MOBILE_MORE_ITEMS.map((item) => {
                    const active = isCurrent(pathname, item.href)
                    const Icon = item.icon
                    return <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} aria-current={active ? 'page' : undefined} className={cn('flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98]', active ? 'border-gold bg-gold/10 text-navy shadow-sm' : 'border-slate-200 bg-white text-navy')}><span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', active ? 'bg-gold text-navy' : 'bg-navy/7 text-navy')}><Icon className="h-5 w-5" /></span><span className="text-sm font-bold leading-tight">{item.label.replace('Mi ', '')}</span></Link>
                })}
            </nav>
        </section>}

        <nav aria-label="Navegación principal del portal" className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(16,42,77,0.12)] backdrop-blur md:hidden">
            <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1">
                {MOBILE_PRIMARY_ITEMS.map((item) => {
                    const active = isCurrent(pathname, item.href)
                    const Icon = item.icon
                    return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition active:scale-95', active ? 'text-navy' : 'text-slate-500')}><span className={cn('flex h-8 w-11 items-center justify-center rounded-xl transition', active && 'bg-gold text-navy shadow-sm')}><Icon className="h-[18px] w-[18px]" /></span><span className="truncate">{item.label.replace('Mi ', '')}</span></Link>
                })}
                <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className={cn('relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition active:scale-95', moreIsActive || moreOpen ? 'text-navy' : 'text-slate-500')}><span className={cn('flex h-8 w-11 items-center justify-center rounded-xl transition', (moreIsActive || moreOpen) && 'bg-gold text-navy shadow-sm')}><ChevronUp className="h-[19px] w-[19px]" /></span><span>Más</span></button>
            </div>
        </nav>
    </>
}
