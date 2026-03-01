import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Sun, Palmtree, Users, Waves, Tent } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function CampusPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Campus</h1>
                <p className="text-slate-500 italic">Módulo de gestión de estancias de verano y tecnificación.</p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border-none bg-indigo-950 h-[600px] flex items-center justify-center">
                {/* Decorative background gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-400/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 text-center space-y-8 max-w-2xl px-6">
                    <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl mb-4">
                        <Sun className="h-16 w-16 text-sky-300 animate-pulse" />
                    </div>

                    <div className="space-y-4">
                        <Badge className="bg-sky-400 text-indigo-950 border-none px-4 py-1 text-xs font-bold uppercase tracking-widest">
                            Verano 2024
                        </Badge>
                        <h2 className="text-5xl font-black text-white tracking-tight">Summer Elite Campus</h2>
                        <p className="text-slate-300 text-lg leading-relaxed">
                            Gestión integral de alojamiento, kits de entrenamiento, reservas y pagos por pasarela Stripe. Un módulo diseñado para maximizar la ocupación y simplificar la operativa.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Feature icon={<Calendar className="h-4 w-4" />} label="Jul-Ago" />
                        <Feature icon={<Tent className="h-4 w-4" />} label="Residency" />
                        <Feature icon={<Users className="h-4 w-4" />} label="Limited" />
                        <Feature icon={<Waves className="h-4 w-4" />} label="Coastal" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function Feature({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <div className="flex flex-col items-center gap-2 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
            <div className="text-sky-300/80">{icon}</div>
            <div className="text-[10px] font-bold text-white uppercase tracking-wider">{label}</div>
        </div>
    )
}
