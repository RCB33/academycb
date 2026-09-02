'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Calendar as CalendarIcon, ChevronUp, FileText, User, Download, ShoppingBag, Video, Store, MessageSquare, Heart, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    return pathname === href || pathname.startsWith(`${href}/`)
}

export function SidebarNav() {
    const pathname = usePathname()

    return (
        <nav className="flex-1 space-y-1 p-4">
            {NAV_ITEMS.map((item) => {
                const active = isCurrent(pathname, item.href)
                const Icon = item.icon

                return <Link key={item.href} href={item.href}><Button variant="ghost" className={cn('w-full justify-start transition-all', active ? 'border-l-[3px] border-primary bg-primary/10 font-bold text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}><Icon className={cn('mr-2 h-4 w-4', active && 'text-primary')} />{item.label}</Button></Link>
            })}
        </nav>
    )
}

export function MobilePortalNav() {
    const pathname = usePathname()
    const [moreOpen, setMoreOpen] = useState(false)
    const moreIsActive = MOBILE_MORE_ITEMS.some((item) => isCurrent(pathname, item.href))

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
