'use client'

import { useEffect } from 'react'

/** Mounting a visible portal counts. Server rendering, link prefetch and Auth do not. */
export function PortalVisitRecorder({ userId }: { userId: string }) {
    useEffect(() => {
        let lastRecorded = 0
        let pending = false
        let disposed = false
        const record = async () => {
            if (disposed || pending || document.visibilityState !== 'visible' || Date.now() - lastRecorded < 300_000) return
            pending = true
            try {
                const response = await fetch('/api/portal/visit', { method: 'POST', credentials: 'same-origin', keepalive: true })
                if (response.ok) lastRecorded = Date.now()
            } catch { /* A reporting failure must never block the family portal. */ }
            finally { pending = false }
        }
        void record()
        document.addEventListener('visibilitychange', record)
        const timer = window.setInterval(record, 300_000)
        return () => {
            disposed = true
            document.removeEventListener('visibilitychange', record)
            window.clearInterval(timer)
        }
    }, [userId])
    return null
}
