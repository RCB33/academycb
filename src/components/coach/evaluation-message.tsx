'use client'
import { MessageSquareQuote } from 'lucide-react'
import { useT } from '@/lib/i18n/client'

export function EvaluationMessage({ notes }: { notes?: string | null }) {
    const translate = useT()
    if (!notes?.trim()) return null
    return <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <h3 className="flex items-center gap-2 font-bold text-navy"><MessageSquareQuote className="h-5 w-5 shrink-0 text-amber-600"/>{translate('Mensaje de tu entrenador')}</h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{notes}</p>
    </div>
}
