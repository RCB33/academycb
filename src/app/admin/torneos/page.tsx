import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Calendar, MapPin, Users, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function TournamentsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Torneos</h1>
                    <p className="text-muted-foreground">Módulo en desarrollo para la temporada 2024/25.</p>
                </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border-none bg-slate-900 h-[600px] flex items-center justify-center">
                {/* Decorative background gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold-600/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 text-center space-y-8 max-w-2xl px-6">
                    <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl mb-4 animate-bounce">
                        <Trophy className="h-16 w-16 text-yellow-500" />
                    </div>

                    <div className="space-y-4">
                        <Badge className="bg-yellow-500 text-slate-900 border-none px-4 py-1 text-xs font-bold uppercase tracking-widest">
                            Próximamente
                        </Badge>
                        <h2 className="text-5xl font-black text-white tracking-tight">Costa Brava Cup 2024</h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Estamos preparando el motor de gestión de torneos más potente. Inscripciones, cuadros de competición en tiempo real y estadísticas de jugadores integrados en el 360º.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Feature icon={<Calendar className="h-4 w-4" />} label="Oct 2024" />
                        <Feature icon={<MapPin className="h-4 w-4" />} label="Girona" />
                        <Feature icon={<Users className="h-4 w-4" />} label="+40 Equipos" />
                        <Feature icon={<Star className="h-4 w-4" />} label="Premium" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function Feature({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <div className="flex flex-col items-center gap-2 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
            <div className="text-yellow-500/80">{icon}</div>
            <div className="text-[10px] font-bold text-white uppercase tracking-wider">{label}</div>
        </div>
    )
}
