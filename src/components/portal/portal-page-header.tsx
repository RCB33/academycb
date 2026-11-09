'use client'
import { useT } from '@/lib/i18n/client'


import type { ReactNode } from 'react'

export function PortalPageHeader({ icon, eyebrow = 'Portal familias', title, description }: { icon: ReactNode; eyebrow?: string; title: string; description: string }) {
    const translate = useT()

    return <header className="relative overflow-hidden rounded-3xl border border-gold/20 bg-navy p-6 text-white shadow-lg shadow-navy/10 sm:p-7">
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-gold/20" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold text-navy shadow-md">{translate(icon)}</span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">{translate(eyebrow)}</p><h1 className="mt-1 font-heading text-2xl font-black uppercase leading-tight [overflow-wrap:anywhere] sm:text-4xl">{translate(title)}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{translate(description)}</p></div>
        </div>
    </header>
}
