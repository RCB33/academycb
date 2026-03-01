'use client'

import { Trophy, Star, Medal, Crown, Zap, Target, Award, Rocket, Heart, Shield, Flame } from "lucide-react"
import { motion } from "framer-motion"

const ICONS: Record<string, any> = {
    trophy: Trophy,
    star: Star,
    medal: Medal,
    crown: Crown,
    zap: Zap,
    target: Target,
    award: Award,
    rocket: Rocket,
    heart: Heart,
    shield: Shield,
    flame: Flame,
}

interface TrophyCardProps {
    achievement: {
        name: string
        description: string
        icon: string
    }
    isEarned: boolean
    earnedAt?: string
}

export function TrophyCard({ achievement, isEarned, earnedAt }: TrophyCardProps) {
    const Icon = ICONS[achievement.icon] || Trophy

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className={`relative group p-5 rounded-2xl border transition-all duration-300 ${isEarned
                ? 'bg-gradient-to-br from-white to-yellow-50/30 border-yellow-200/60 shadow-md'
                : 'bg-slate-50 border-slate-100 opacity-60 grayscale-[0.5]'
                }`}
        >
            {isEarned && (
                <div className="absolute top-0 right-0 p-2">
                    <div className="bg-yellow-100/50 backdrop-blur-sm p-1 rounded-full border border-yellow-200/50">
                        <Star className="h-3 w-3 text-yellow-600 fill-yellow-600" />
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center text-center space-y-3">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${isEarned
                    ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-700 shadow-inner'
                    : 'bg-slate-200 text-slate-400'
                    }`}>
                    <Icon className="h-8 w-8" />
                </div>

                <div className="space-y-1">
                    <h4 className={`font-black text-sm tracking-tight ${isEarned ? 'text-slate-900' : 'text-slate-500'}`}>
                        {achievement.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-tight line-clamp-2 px-1">
                        {achievement.description}
                    </p>
                </div>

                {isEarned && earnedAt && (
                    <div className="pt-2">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100/50 text-yellow-700 text-[10px] font-bold border border-yellow-200/40">
                            {new Date(earnedAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                        </div>
                    </div>
                )}

                {!isEarned && (
                    <div className="pt-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Bloqueado
                        </span>
                    </div>
                )}
            </div>

            {/* Decorative glint for earned trophies */}
            {isEarned && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-x-full group-hover:translate-x-full transform" />
                </div>
            )}
        </motion.div>
    )
}
