'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import styles from './portal-entry-loading.module.css'

export function PortalEntryLoading({ checking = false }: { checking?: boolean }) {
    const translate = useT()
    const [takingLonger, setTakingLonger] = useState(false)

    useEffect(() => {
        const timer = window.setTimeout(() => setTakingLonger(true), 12000)
        return () => window.clearTimeout(timer)
    }, [])

    return (
        <div className={styles.screen} data-portal-entry-loading>
            <div className={styles.content}>
                <p className={styles.brand}>ACADEMY <span>COSTA BRAVA</span></p>
                <svg className={styles.pitch} viewBox="0 0 320 180" fill="none" aria-hidden="true">
                    <defs>
                        <pattern id="entry-goal-net" width="12" height="12" patternUnits="userSpaceOnUse">
                            <path d="M12 0H0V12" stroke="white" strokeOpacity=".2" strokeWidth="1" />
                        </pattern>
                        <radialGradient id="entry-pitch-glow">
                            <stop stopColor="#D4AF37" stopOpacity=".2" />
                            <stop offset="1" stopColor="#D4AF37" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <ellipse cx="170" cy="146" rx="145" ry="28" fill="url(#entry-pitch-glow)" />
                    <path d="M18 148H306M68 148l28-25h94M171 148l26-25h104" stroke="#D4AF37" strokeOpacity=".3" strokeWidth="1.5" />
                    <g className={styles.net}>
                        <path d="M216 48h67l18 94h-85z" fill="url(#entry-goal-net)" />
                        <path d="M216 48h67l18 94h-85V48Z" stroke="white" strokeOpacity=".35" strokeWidth="2" strokeLinejoin="round" />
                        <path d="M198 142V39h67v103M198 39l18 9M265 39l18 9M265 142h36" stroke="#F2CE67" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <ellipse className={styles.shadow} cx="44" cy="145" rx="13" ry="3" fill="#020B17" fillOpacity=".6" />
                    <g className={styles.ball}>
                        <g className={styles.spin}>
                            <circle r="12" fill="#FAFAF5" stroke="#D4AF37" strokeWidth="1.3" />
                            <path d="m0-5 5 4-2 6h-6l-2-6zM-10-6l5 1M10-6 5-5M0 12V5M-11 5l6-2M11 5 5 3M0-12v7" fill="#102542" stroke="#102542" strokeWidth="1.2" strokeLinejoin="round" />
                        </g>
                    </g>
                    <g className={styles.spark} stroke="#F2CE67" strokeWidth="2" strokeLinecap="round">
                        <path d="m280 34 5-8M291 46l9-2M272 23V15" />
                    </g>
                </svg>
                <div role="status" aria-live="polite" aria-atomic="true">
                    <h1 className={styles.title}>{translate(checking ? 'Comprobando tu acceso…' : 'Entrando al portal…')}</h1>
                    <p className={styles.description}>{translate(takingLonger
                        ? 'Está tardando un poco más. Seguimos preparando tu acceso.'
                        : checking ? 'Un momento, estamos comprobando tus datos.' : 'Estamos preparando tu espacio Academy.')}</p>
                </div>
                <div className={styles.dots} aria-hidden="true"><span /><span /><span /></div>
            </div>
        </div>
    )
}
