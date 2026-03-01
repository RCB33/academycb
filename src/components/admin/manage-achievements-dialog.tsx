'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createAchievement, deleteAchievement } from "@/app/actions/gamification"
import { toast } from "sonner"
import { Trophy, Star, Medal, Crown, Zap, Target, Award, Plus, Trash2, Loader2, Settings, Rocket, Heart, Shield, Flame } from "lucide-react"

const ICONS = [
    { name: 'trophy', icon: Trophy },
    { name: 'star', icon: Star },
    { name: 'medal', icon: Medal },
    { name: 'crown', icon: Crown },
    { name: 'zap', icon: Zap },
    { name: 'target', icon: Target },
    { name: 'award', icon: Award },
    { name: 'rocket', icon: Rocket },
    { name: 'heart', icon: Heart },
    { name: 'shield', icon: Shield },
    { name: 'flame', icon: Flame },
]

export function ManageAchievementsDialog({ achievements, onUpdate }: { achievements: any[], onUpdate: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // New Achievement Form
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: 'trophy'
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const result = await createAchievement(formData)
        if (result.success) {
            toast.success("Logro creado")
            setFormData({ name: '', description: '', icon: 'trophy' })
            setIsCreating(false)
            onUpdate() // Trigger refresh in parent
        } else {
            toast.error("Error: " + result.error)
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar este logro?")) return
        const result = await deleteAchievement(id)
        if (result.success) {
            toast.success("Logro eliminado")
            onUpdate()
        } else {
            toast.error("Error al eliminar")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                    <Settings className="h-4 w-4" /> Gestionar
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-slate-200 shadow-xl max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gestión de Gamificación</DialogTitle>
                    <DialogDescription>Crea y administra los trofeos disponibles para los alumnos.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6 px-1">
                    {/* List Existing */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <h4 className="font-bold text-sm text-slate-700">Trofeos Disponibles ({achievements.length})</h4>
                            <Button size="sm" onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "secondary" : "default"} className={isCreating ? "" : "bg-yellow-500 hover:bg-yellow-600 text-black font-bold"}>
                                {isCreating ? "Cancelar" : <><Plus className="h-4 w-4 mr-1" /> Nuevo</>}
                            </Button>
                        </div>

                        {isCreating && (
                            <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-yellow-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="grid gap-2">
                                    <Label>Nombre del Logro</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-white"
                                        placeholder="Ej: Máximo Goleador"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Descripción</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-white resize-none"
                                        placeholder="Ej: Anotar más de 20 goles en una temporada"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Icono</Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {ICONS.map((item) => {
                                            const Icon = item.icon
                                            return (
                                                <button
                                                    key={item.name}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, icon: item.name })}
                                                    className={`p-2 rounded-lg border transition-all ${formData.icon === item.name ? 'bg-yellow-100 border-yellow-500 text-yellow-700 ring-2 ring-yellow-200' : 'bg-white border-slate-200 text-slate-400 hover:border-yellow-300'}`}
                                                >
                                                    <Icon className="h-6 w-6" />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-bold">
                                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Crear Trofeo
                                </Button>
                            </form>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {achievements.map((ach) => {
                                const iconItem = ICONS.find(i => i.name === ach.icon) || ICONS[0]
                                const Icon = iconItem.icon
                                return (
                                    <div key={ach.id} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-lg group hover:border-slate-300 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
                                            <Icon className="h-5 w-5 text-yellow-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-slate-900 truncate">{ach.name}</p>
                                            <p className="text-xs text-slate-500 line-clamp-2">{ach.description}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDelete(ach.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
