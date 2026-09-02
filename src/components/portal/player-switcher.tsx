'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, UsersRound } from 'lucide-react'

type Player = {
    id: string
    full_name: string
    birth_year?: number | null
}

export function PortalPlayerSwitcher({
    players,
    variant = 'sidebar',
}: {
    players: Player[]
    variant?: 'sidebar' | 'mobile'
}) {
    const pathname = usePathname()
    const router = useRouter()
    const currentPlayer = players.find((player) => pathname === `/portal/${player.id}`)
    const compact = variant === 'mobile'

    if (players.length < 2) return null

    return (
        <section className={compact ? 'border-t border-navy/10 bg-white px-4 py-2.5' : 'mt-5 rounded-2xl border border-gold/25 bg-gold/5 p-3'} aria-label="Cambiar jugador">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-navy/65">
                    <UsersRound className="h-3.5 w-3.5 text-gold" />
                    {currentPlayer ? 'Jugador seleccionado' : 'Mis jugadores'}
                </span>
                <Link href="/portal/dashboard" className="text-[11px] font-bold text-navy underline-offset-2 hover:text-gold hover:underline">
                    Ver todos
                </Link>
            </div>
            <div className="relative">
                <select
                    aria-label="Cambiar jugador"
                    value={currentPlayer?.id ?? ''}
                    onChange={(event) => {
                        if (event.target.value) router.push(`/portal/${event.target.value}`)
                    }}
                    className="h-10 w-full appearance-none rounded-xl border border-navy/15 bg-white py-2 pl-3 pr-9 text-sm font-bold text-navy outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                >
                    <option value="" disabled>{currentPlayer ? currentPlayer.full_name : 'Selecciona una ficha'}</option>
                    {players.map((player) => (
                        <option key={player.id} value={player.id}>
                            {player.full_name}{player.birth_year ? ` · ${player.birth_year}` : ''}
                        </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/60" />
            </div>
        </section>
    )
}
