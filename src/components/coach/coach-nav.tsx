'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Home, LogOut, Trophy, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
    { href: '/coach', label: 'Hoy', icon: Home },
    { href: '/coach/calendario', label: 'Calendario', icon: CalendarDays },
    { href: '/cuenta', label: 'Mi cuenta', icon: UserRound },
]

function activePath(pathname: string, href: string) {
    return href === '/coach' ? pathname === href || pathname.startsWith('/coach/session/') : pathname === href || pathname.startsWith(`${href}/`)
}

export function CoachNav({ signOut }: { signOut: () => Promise<void> }) {
    const pathname = usePathname()
    return <>
        <header className="sticky top-0 z-30 shrink-0 border-b border-white/10 bg-navy text-white shadow-md">
            <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6">
                <Link href="/coach" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-navy"><Trophy className="h-5 w-5" /></span><span><span className="block font-heading text-base font-black uppercase tracking-wide">Academy</span><span className="block text-[9px] uppercase tracking-[0.18em] text-slate-300">Equipo técnico</span></span></Link>
                <nav className="hidden items-center gap-2 sm:flex" aria-label="Navegación del entrenador">{items.map((item) => { const Icon = item.icon; const active = activePath(pathname, item.href); return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition', active ? 'bg-gold text-navy' : 'text-slate-200 hover:bg-white/10 hover:text-white')}><Icon className="h-4 w-4" />{item.label}</Link> })}</nav>
                <form action={signOut}><button type="submit" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar sesión"><LogOut className="h-5 w-5" /></button></form>
            </div>
        </header>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t border-navy/10 bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(16,42,77,0.12)] backdrop-blur sm:hidden" aria-label="Navegación del entrenador">{items.map((item) => { const Icon = item.icon; const active = activePath(pathname, item.href); return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('my-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition active:scale-95', active ? 'bg-gold text-navy shadow-sm' : 'text-slate-500')}><Icon className="h-5 w-5" />{item.label}</Link> })}</nav>
    </>
}
