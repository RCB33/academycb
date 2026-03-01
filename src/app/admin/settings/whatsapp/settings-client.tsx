'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { saveWhatsAppSettings } from '@/app/actions/whatsapp'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Smartphone, CheckCircle2, XCircle } from 'lucide-react'

interface Props {
    initialIdInstance: string;
    initialApiToken: string;
    initialStatus: string;
    qrMessage: string | null;
}

export function WhatsAppSettingsClient({ initialIdInstance, initialApiToken, initialStatus, qrMessage }: Props) {
    const [idInstance, setIdInstance] = useState(initialIdInstance)
    const [apiToken, setApiToken] = useState(initialApiToken)
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        const result = await saveWhatsAppSettings(idInstance, apiToken)
        if (result.success) {
            toast.success("Configuración guardada. Comprobando estado...")
            // The page will revalidate and refresh Server Components
            window.location.reload()
        } else {
            toast.error(result.error || "Error al guardar la configuración")
        }
        setIsSaving(false)
    }

    return (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <Card>
                <form onSubmit={handleSave}>
                    <CardHeader>
                        <CardTitle>Credenciales Green API</CardTitle>
                        <CardDescription>Obtén estas credenciales en tu panel de console.green-api.com</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="idInstance">ID Instance</Label>
                            <Input
                                id="idInstance"
                                value={idInstance}
                                onChange={(e) => setIdInstance(e.target.value)}
                                placeholder="Ej: 110182345"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="apiToken">API Token Instance</Label>
                            <Input
                                id="apiToken"
                                type="password"
                                value={apiToken}
                                onChange={(e) => setApiToken(e.target.value)}
                                placeholder="****************"
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar y Conectar
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            {/* Status Panel */}
            <Card>
                <CardHeader>
                    <CardTitle>Estado de Conexión</CardTitle>
                    <CardDescription>Verifica si la instancia está enlazada a tu teléfono</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6">
                    {initialStatus === 'authorized' ? (
                        <div className="text-center space-y-4">
                            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-green-700">Conectado Correctamente</h3>
                                <p className="text-sm text-slate-500 mt-2">Tu instancia está vinculada y lista para enviar mensajes.</p>
                            </div>
                        </div>
                    ) : initialStatus === 'notAuthorized' ? (
                        <div className="text-center space-y-4 w-full">
                            <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Smartphone className="h-10 w-10 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-amber-700">Pendiente de Autorizar</h3>
                            <p className="text-sm text-slate-500 px-4">Abre WhatsApp en tu móvil &gt; Dispositivos Vinculados &gt; Vincular Dispositivo, y escanea el siguiente código QR:</p>

                            {qrMessage ? (
                                <div className="mt-4 p-4 bg-white border border-slate-200 rounded-2xl mx-auto inline-block shadow-sm">
                                    <img src={`data:image/png;base64,${qrMessage}`} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto" />
                                </div>
                            ) : (
                                <div className="text-sm text-red-500 font-medium">No se pudo cargar el código QR. Revisa las credenciales.</div>
                            )}

                            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
                                <RefreshCw className="mr-2 h-4 w-4" /> Ya lo he escaneado
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                                <XCircle className="h-10 w-10 text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-700">No Configurado</h3>
                                <p className="text-sm text-slate-500 mt-2">Introduce tus credenciales y guarda para visualizar el estado.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
