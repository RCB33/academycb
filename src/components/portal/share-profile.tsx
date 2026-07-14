'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check, Printer, ExternalLink, RotateCcw } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import { rotatePublicShareToken } from '@/app/actions/share'

interface ShareProfileProps {
    token: string
    childId: string
    childName: string
}

export function ShareProfile({ token, childId, childName }: ShareProfileProps) {
    const [copied, setCopied] = useState(false)
    const [activeToken, setActiveToken] = useState(token)
    const [rotating, setRotating] = useState(false)

    // Use window.location.origin if available, otherwise generic
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const publicUrl = `${origin}/player/public/${activeToken}`

    const handleCopy = () => {
        navigator.clipboard.writeText(publicUrl)
        setCopied(true)
        toast.success('Enlace copiado al portapapeles')
        setTimeout(() => setCopied(false), 2000)
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Mira la ficha de ${childName} en Academy Costa Brava: ${publicUrl}`)}`

    const handleRotate = async () => {
        if (!confirm('El enlace anterior dejará de funcionar. ¿Quieres renovarlo?')) return
        setRotating(true)
        const result = await rotatePublicShareToken(childId)
        setRotating(false)
        if (!result.success) return toast.error(result.error)
        setActiveToken(result.token)
        setCopied(false)
        toast.success('Enlace renovado')
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Compartir Ficha</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Compartir Ficha de Jugador</DialogTitle>
                    <DialogDescription>
                        Cualquier persona con este enlace podrá ver la ficha pública de {childName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 mt-4">
                    <div className="grid flex-1 gap-2">
                        <Input
                            id="link"
                            defaultValue={publicUrl}
                            readOnly
                            className="h-9"
                        />
                    </div>
                    <Button type="submit" size="sm" className="px-3" onClick={handleCopy}>
                        {copied ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <Button variant="outline" className="w-full gap-2" asChild>
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            <span className="text-green-600 font-bold">WhatsApp</span>
                        </a>
                    </Button>
                    <Button variant="outline" className="w-full gap-2" asChild>
                        <Link href={`/player/public/${activeToken}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            Ver Ficha
                        </Link>
                    </Button>
                </div>

                <Button variant="ghost" size="sm" disabled={rotating} onClick={handleRotate} className="mx-auto mt-2 gap-2 text-amber-700">
                    <RotateCcw className={`h-4 w-4 ${rotating ? 'animate-spin' : ''}`} />
                    Invalidar enlace anterior
                </Button>

                <div className="text-center mt-4">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Printer className="h-3 w-3" />
                        <span>Tip: Abre la ficha pública y usa CTRL+P para descargar como PDF</span>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
