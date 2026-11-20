'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function ResultRefresh({ pending }: { pending: boolean }) {
    const router = useRouter()
    const [exhausted, setExhausted] = useState(false)
    useEffect(() => {
        if (!pending) return
        let checks = 0
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return
            router.refresh()
            if (++checks >= 8) { clearInterval(timer); setExhausted(true) }
        }, 7500)
        return () => clearInterval(timer)
    }, [pending, router])
    if (!pending) return null
    return <div className="mt-5 text-sm text-slate-600">
        <p>{exhausted ? 'La confirmación puede tardar. Puedes cerrar esta página y volver a consultar el estado más tarde.' : 'Comprobando el estado automáticamente…'}</p>
        <button onClick={() => router.refresh()} className="mt-3 min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-[#10294a]">Actualizar estado</button>
    </div>
}
