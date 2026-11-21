'use client'

import { useId, useState } from 'react'
import { useT } from '@/lib/i18n/client'

export function CommunityCaption({ body }: { body: string }) {
    const t = useT()
    const id = useId()
    const [expanded, setExpanded] = useState(false)
    const long = body.length > 240 || body.split('\n').length > 4
    return <div className="px-5 py-4">
        <p id={id} className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-700 ${long && !expanded ? 'line-clamp-4' : ''}`}>{body}</p>
        {long && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)} className="min-h-11 py-2 text-sm font-bold text-navy underline underline-offset-4">{t(expanded ? 'Ver menos' : 'Ver más')}</button>}
    </div>
}
