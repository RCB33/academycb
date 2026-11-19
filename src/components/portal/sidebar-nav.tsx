'use client'
import { LanguageSwitcher, useT } from '@/lib/i18n/client'


import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, FileText, User, Download, ShoppingBag, Video, Store, MessageSquare, Heart, Trophy, CircleHelp, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/ui/notification-bell'
import { PortalPlayerSwitcher } from '@/components/portal/player-switcher'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { FAMILY_NAVIGATION, isFamilyRouteCurrent } from '@/lib/family-navigation'

const icons = { home: Home, calendar: CalendarIcon, payments: ShoppingBag, messages: MessageSquare, trophy: Trophy, documents: FileText, downloads: Download, user: User, help: CircleHelp, heart: Heart, video: Video, store: Store }
const NAV_ITEMS = FAMILY_NAVIGATION.map(item => ({ ...item, icon: icons[item.icon] }))
const MOBILE_PRIMARY_ITEMS = NAV_ITEMS.filter(item => item.primary)
const MOBILE_MORE_ITEMS = NAV_ITEMS.filter(item => !item.primary)
const isCurrent = isFamilyRouteCurrent

export function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
    const translate = useT()

    const pathname = usePathname()

    return (
        <nav className={cn('flex-1 space-y-1 overflow-y-auto', collapsed ? 'px-2 py-4' : 'p-4')}>
            {translate(NAV_ITEMS.map((item, index) => {
                const active = isCurrent(pathname, item.href)
                const Icon = item.icon

                return <div key={item.href}>{!collapsed && (index === 0 || NAV_ITEMS[index - 1].group !== item.group) && <p className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">{translate(item.group)}</p>}<Link href={item.href} title={translate(item.label)} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 items-center rounded-xl text-sm font-semibold transition-all', collapsed ? 'justify-center px-2' : 'gap-3 px-3', active ? 'bg-gold text-navy shadow-md shadow-black/15' : 'text-slate-300 hover:bg-white/10 hover:text-white')}><Icon className="h-[18px] w-[18px] shrink-0" />{translate(!collapsed && <span className="truncate">{translate(item.label)}</span>)}</Link></div>
            }))}
        </nav>
    )
}

type FamilyPlayer = { id: string; full_name: string; birth_year?: number | null }

export function PortalDesktopSidebar({ players, userEmail, signOut }: { players: FamilyPlayer[]; userEmail: string; signOut: () => Promise<void> }) {
    const translate = useT()

    const [collapsed, setCollapsed] = useState(false)


    return <aside className={cn('group/sidebar relative z-20 hidden h-screen shrink-0 flex-col bg-navy text-white shadow-xl transition-[width] duration-300 md:flex', collapsed ? 'w-20' : 'w-64')}>
        <div className={cn('flex h-[5.5rem] shrink-0 items-center border-b border-white/10 bg-navy-dark/40', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
            <Link href="/portal/dashboard" className={cn('flex items-center font-bold', collapsed ? 'h-10 w-10 justify-center rounded-xl bg-gold text-navy' : 'gap-3')} title={translate("Portal Familias")}>
                <Trophy className={cn('h-5 w-5 shrink-0', collapsed ? 'text-navy' : 'text-gold')} />
                {translate(!collapsed && <span><span className="block font-heading text-lg font-black uppercase tracking-wide">{translate("Academy")}</span><span className="block text-[9px] uppercase tracking-[0.18em] text-slate-400">{translate("Portal familias")}</span></span>)}
            </Link>
            {translate(!collapsed && <button type="button" onClick={() => setCollapsed(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label={translate("Contraer menú")}><ChevronLeft className="h-5 w-5" /></button>)}
        </div>
        {translate(collapsed && <button type="button" onClick={() => setCollapsed(false)} className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gold transition hover:bg-white/10" aria-label={translate("Desplegar menú")}><ChevronRight className="h-5 w-5" /></button>)}
        {translate(!collapsed && <div className="px-4 pt-4"><PortalPlayerSwitcher players={players} /></div>)}
        <div className="flex justify-center py-3"><LanguageSwitcher compact={collapsed} /></div>
        <SidebarNav collapsed={collapsed} />
        <div className={cn('shrink-0 border-t border-white/10 bg-navy-dark/30', collapsed ? 'p-2' : 'p-4')}>
            {translate(!collapsed && <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-2"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-xs font-black text-navy">{translate(userEmail.charAt(0).toUpperCase())}</div><p className="min-w-0 flex-1 truncate text-xs text-slate-200">{translate(userEmail)}</p><NotificationBell /></div>)}
            <form action={signOut}><button className={cn('flex min-h-11 w-full items-center rounded-xl text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white', collapsed ? 'justify-center px-2' : 'gap-3 px-3')} title={translate("Cerrar sesión")}><LogOut className="h-[18px] w-[18px]" />{translate(!collapsed && 'Cerrar sesión')}</button></form>
        </div>
    </aside>
}

export function MobilePortalNav() {
    const translate = useT()

    const pathname = usePathname()
    const [moreOpen, setMoreOpen] = useState(false)
    const moreIsActive = MOBILE_MORE_ITEMS.some((item) => isCurrent(pathname, item.href))

    useEffect(() => setMoreOpen(false), [pathname])


    return <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="left-0 top-auto bottom-0 w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border-0 bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80dvh]">
            <DialogTitle className="pr-8 text-2xl font-black text-navy">{translate('Más secciones')}</DialogTitle>
            <DialogDescription>{translate('Inscripciones, documentos y opciones de tu familia.')}</DialogDescription>
            <nav className="grid grid-cols-2 gap-3" aria-label={translate('Más secciones')}>
                {MOBILE_MORE_ITEMS.map(item => {
                    const active = isCurrent(pathname, item.href)
                    const Icon = item.icon
                    return <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} aria-current={active ? 'page' : undefined} className={cn('flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border p-3 text-navy', active ? 'border-gold bg-gold/10' : 'border-slate-200 bg-white')}><Icon className="h-5 w-5 shrink-0" /><span className="break-words text-sm font-bold">{translate(item.label)}</span></Link>
                })}
            </nav>
        </DialogContent>
        <nav aria-label={translate('Navegación principal del portal')} className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(16,42,77,0.12)] backdrop-blur md:hidden">
            <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1">
                {MOBILE_PRIMARY_ITEMS.map(item => {
                    const active = isCurrent(pathname, item.href)
                    const Icon = item.icon
                    return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold', active ? 'text-navy' : 'text-slate-500')}><span className={cn('flex h-8 w-11 items-center justify-center rounded-xl', active && 'bg-gold text-navy')}><Icon className="h-[18px] w-[18px]" /></span><span>{translate(item.label)}</span></Link>
                })}
                <DialogTrigger asChild><button type="button" className={cn('flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold', moreIsActive || moreOpen ? 'text-navy' : 'text-slate-500')}><span className={cn('flex h-8 w-11 items-center justify-center rounded-xl', (moreIsActive || moreOpen) && 'bg-gold text-navy')}><ChevronUp className="h-[19px] w-[19px]" /></span><span>{translate('Más')}</span></button></DialogTrigger>
            </div>
        </nav>
    </Dialog>
}
