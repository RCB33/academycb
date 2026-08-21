'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Calendar as CalendarIcon, FileText, User, Download, ShoppingBag, Video, Store, MessageSquare, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
    { href: '/portal/dashboard', label: 'Inicio', icon: Home },
    { href: '/portal/comunicados', label: 'Comunicados', icon: MessageSquare },
    { href: '/portal/muro', label: 'Muro Academy', icon: Heart },
    { href: '/portal/profile', label: 'Mi Perfil', icon: User },
    { href: '/portal/calendario', label: 'Mi Calendario', icon: CalendarIcon },
    { href: '/portal/videoteca', label: 'Videoteca', icon: Video },
    { href: '/portal/documentos', label: 'Documentos', icon: FileText },
    { href: '/portal/pagos', label: 'Pagos', icon: ShoppingBag },
    { href: '/portal/tienda', label: 'Tienda', icon: Store },
    { href: '/portal/descargas', label: 'Descargas', icon: Download },
]

export function SidebarNav() {
    const pathname = usePathname()

    return (
        <nav className="flex-1 p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                    <Link key={item.href} href={item.href}>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start transition-all",
                                isActive
                                    ? "bg-primary/10 text-primary font-bold border-l-[3px] border-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <Icon className={cn("mr-2 h-4 w-4", isActive && "text-primary")} />
                            {item.label}
                        </Button>
                    </Link>
                )
            })}
        </nav>
    )
}

export function MobilePortalNav() {
    const pathname = usePathname()

    return (
        <nav aria-label="Navegación del portal" className="md:hidden border-b bg-background px-2 py-2 shadow-sm">
            <div className="flex gap-1 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide" role="list">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'flex min-w-20 shrink-0 snap-start flex-col items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="whitespace-nowrap">{item.label.replace('Mi ', '')}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
