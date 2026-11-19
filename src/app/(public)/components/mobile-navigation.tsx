'use client'

import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { useT } from '@/lib/i18n/client'

export default function MobileNavigation({ children }: { children: ReactNode }) {
    const translate = useT()
    return <details className="relative xl:hidden" onClick={event => {
        if (event.target instanceof Element && event.target.closest('a')) event.currentTarget.open = false
    }}>
        <summary aria-label={translate('Abrir menú')} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-white/20 text-white [&::-webkit-details-marker]:hidden">
            <Menu className="h-5 w-5" />
        </summary>
        {children}
    </details>
}
