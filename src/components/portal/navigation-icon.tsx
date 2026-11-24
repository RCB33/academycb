'use client'

import { useLinkStatus } from 'next/link'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { useT } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'

/** Lives inside Link so feedback follows the real navigation, including cancellation. */
export function PortalNavigationIcon({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className?: string }) {
    const { pending } = useLinkStatus()
    const translate = useT()

    return <>
        {pending
            ? <LoaderCircle aria-hidden="true" className={cn(className, 'animate-spin motion-reduce:animate-none text-gold')} />
            : <Icon aria-hidden="true" className={className} />}
        <span role="status" className="sr-only">{pending ? `${translate('Abriendo')} ${translate(label)}…` : ''}</span>
    </>
}
