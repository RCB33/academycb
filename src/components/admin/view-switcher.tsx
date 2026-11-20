'use client'
import Link from 'next/link'
import { Eye, ChevronDown, Check } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function ViewSwitcher({ current = 'admin' }: { current?: 'admin' | 'coach' | 'parents' }) {
    return <DropdownMenu><DropdownMenuTrigger className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-navy shadow-sm hover:bg-slate-50" aria-label="Cambiar vista"><Eye className="h-4 w-4" />Vista<ChevronDown className="h-4 w-4" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56">
        {([{id:'admin', label:'Vista administrador', href:'/admin/dashboard'}, {id:'coach', label:'Vista entrenador', href:'/coach'}, {id:'parents', label:'Vista padres', href:'/portal/dashboard'}] as const).map(item => <DropdownMenuItem key={item.id} asChild><Link href={item.href} className="flex min-h-11 items-center justify-between gap-4">{item.label}{current === item.id && <Check className="h-4 w-4" />}</Link></DropdownMenuItem>)}
    </DropdownMenuContent></DropdownMenu>
}
