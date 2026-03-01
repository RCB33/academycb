'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { sendBroadcastMessage } from '@/app/actions/whatsapp'
import { toast } from 'sonner'
import { Loader2, Send, AlertTriangle } from 'lucide-react'

interface Props {
    categories: { id: string, name: string }[]
}

export function BroadcastClient({ categories }: Props) {
    const [categoryId, setCategoryId] = useState<string>('')
    const [message, setMessage] = useState<string>('')
    const [isSending, setIsSending] = useState(false)

    const handleSend = async () => {
        if (!categoryId) {
            toast.error("Selecciona una categoría o equipo.")
            return
        }
        if (!message.trim()) {
            toast.error("Escribe un mensaje.")
            return
        }

        const confirmed = window.confirm("¿Estás seguro de enviar este mensaje masivo por WhatsApp? No se puede deshacer.")
        if (!confirmed) return

        setIsSending(true)

        try {
            const result = await sendBroadcastMessage(categoryId, message)

            if (result.success) {
                toast.success(`Mensaje enviado. Éxitos: ${result.summary?.success}, Errores: ${result.summary?.failed}`)
                setMessage('') // Clear message after success
            } else {
                toast.error(result.error || "Error al enviar el mensaje masivo.")
            }
        } catch (e: any) {
            toast.error("Error inesperado en el envío.")
            console.error(e)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Card className="border-red-500/20 shadow-lg shadow-red-500/5">
            <CardHeader className="bg-red-50/50 border-b border-red-100">
                <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    El "Botón del Pánico"
                </CardTitle>
                <CardDescription>
                    Usa esta herramienta con precaución. Los mensajes llegarán directamente al teléfono de los padres. Ideal para cancelaciones por lluvia, cambios de horario urgentes o noticias críticas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                    <Label htmlFor="category">Equipo Destinatario</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona el equipo..." />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="message">Mensaje Original</Label>
                    <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="📍 Atención: El entrenamiento de hoy ha sido cancelado por fuertes lluvias..."
                        rows={6}
                        required
                    />
                    <p className="text-xs text-muted-foreground text-right">
                        {message.length} caracteres
                    </p>
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t justify-end">
                <Button
                    onClick={handleSend}
                    disabled={isSending || !categoryId || !message.trim()}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                    {isSending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                        <><Send className="mr-2 h-4 w-4" /> Enviar a todos</>
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
