'use client'

import { motion } from "framer-motion"

type Stats = {
    pace: number
    shooting: number
    passing: number
    dribbling: number
    defending: number
    physical: number
    discipline?: number
}

type FifaCardProps = {
    stats: Stats
    child: any
    ovr?: number
    className?: string
}

export function FifaCard({ stats, child, ovr, className }: FifaCardProps) {
    // Calculate OVR if not provided
    if (!ovr) {
        const values = [stats.pace, stats.shooting, stats.passing, stats.dribbling, stats.defending, stats.physical]
        ovr = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex justify-center ${className}`}
        >
            <div className="relative w-full max-w-[320px] aspect-[2/3] bg-slate-950 rounded-[2rem] shadow-[0_0_30px_rgba(234,179,8,0.4)] overflow-hidden border-[3px] border-yellow-500/80 flex flex-col text-white">

                {/* Background Effects */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-950"></div>
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-yellow-500/10 blur-[60px] rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[85%] border border-yellow-500/20 rounded-[1.5rem] z-0"></div>

                {/* Card Content */}
                <div className="relative z-10 h-full flex flex-col p-5">

                    {/* Top Section: Rating & Position */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col items-center leading-none">
                            <span className="text-5xl font-[900] text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">{ovr}</span>
                            <span className="text-lg font-bold text-white tracking-widest mt-1">OVR</span>
                        </div>
                        <div className="flex flex-col items-center">
                            {/* Academy Logo */}
                            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-yellow-500/30 flex items-center justify-center overflow-hidden">
                                <img src="/logo.jpg" className="w-full h-full object-cover opacity-90" alt="Academy Costa Brava" />
                            </div>
                        </div>
                    </div>

                    {/* Player Image Area */}
                    <div className="relative flex-1 min-h-[160px] mx-auto w-full max-w-[200px] my-2">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-20"></div>
                        {child?.avatar_url ? (
                            <img src={child.avatar_url} className="w-full h-full object-cover object-top rounded-t-xl mask-image-gradient" alt={child.full_name} />
                        ) : (
                            <UserCircleIcon className="w-full h-full text-slate-600" />
                        )}
                    </div>

                    {/* Player Name */}
                    <div className="text-center mb-4 relative">
                        <h2 className="text-2xl font-[900] text-white uppercase tracking-wider drop-shadow-md border-b-2 border-yellow-500/50 inline-block pb-1 px-4">
                            {child?.full_name || 'JUGADOR'}
                        </h2>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full font-bold text-lg tracking-wide uppercase px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-500 w-8 text-right">{stats.pace}</span>
                            <span className="text-yellow-100/70 text-sm font-normal">PAC</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-500 w-8 text-right">{stats.dribbling}</span>
                            <span className="text-yellow-100/70 text-sm font-normal">REG</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-500 w-8 text-right">{stats.shooting}</span>
                            <span className="text-yellow-100/70 text-sm font-normal">TIR</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-500 w-8 text-right">{stats.defending}</span>
                            <span className="text-yellow-100/70 text-sm font-normal">DEF</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-500 w-8 text-right">{stats.passing}</span>
                            <span className="text-yellow-100/70 text-sm font-normal">PAS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-500 w-8 text-right">{stats.physical}</span>
                            <span className="text-yellow-100/70 text-sm font-normal">FIS</span>
                        </div>
                    </div>

                    {/* Bottom Decor */}
                    <div className="mt-auto pt-4 flex justify-center">
                        <div className="h-1 w-16 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,1)]"></div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function UserCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
        </svg>
    )
}
