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
import { linkGuardianByEmail } from "@/app/actions/students"
import { toast } from "sonner"
import { Link2, Loader2, Plus, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"

export function LinkGuardianDialog({ childId, onUpdate }: { childId: string, onUpdate?: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await linkGuardianByEmail(childId, email)
            if (result.success) {
                toast.success("Tutor vinculado correctamente")
                setOpen(false)
                setEmail('')
                if (onUpdate) {
                    onUpdate()
                }
                router.refresh()
            } else {
                toast.error(result.error || "Error al vincular tutor")
            }
        } catch (error) {
            toast.error("Error desconocido")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-dashed">
                    <UserPlus className="mr-2 h-4 w-4" /> Vincular Tutor
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white text-slate-900 border-slate-200">
                <DialogHeader>
                    <DialogTitle>Vincular Tutor / Acceso Familia</DialogTitle>
                    <DialogDescription>
                        Introduce el email del usuario registrado para darle acceso a este alumno. Si no está registrado, se creará una ficha de tutor pendiente.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email del Usuario</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="ejemplo@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Vincular
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
