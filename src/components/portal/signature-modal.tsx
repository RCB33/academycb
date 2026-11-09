'use client'
import { useT } from '@/lib/i18n/client'


import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createSignature } from '@/app/actions/signatures'
import { toast } from 'sonner'
import { Loader2, PenLine } from 'lucide-react'
import Link from 'next/link'

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    guardianId: string;
    documentType: string;
    documentVersion: string;
    childId?: string;
    childName?: string;
    consentOptions?: { portal_internal: boolean; public_communications: boolean };
    onSuccess: () => void;
}

export function SignatureModal({ isOpen, onClose, guardianId, documentType, documentVersion, childId, childName, consentOptions, onSuccess }: SignatureModalProps) {
    const translate = useT()

    const padRef = useRef<SignatureCanvas>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const clearSignature = () => {
        padRef.current?.clear()
    }

    const saveSignature = async () => {
        if (!padRef.current || padRef.current.isEmpty()) {
            toast.error(translate("Por favor, proporciona tu firma."))
            return
        }

        setIsSubmitting(true)
        const signatureBase64 = padRef.current.getTrimmedCanvas().toDataURL('image/png')

        try {
            const result = await createSignature({
                guardianId,
                documentType,
                documentVersion,
                childId,
                consentOptions,
                signatureBase64
            })

            if (result.success) {
                toast.success(translate("Documento firmado correctamente."))
                onSuccess()
                onClose()
            } else {
                toast.error(translate(result.error || "Error al guardar la firma."))
            }
        } catch (error) {
            console.error(error)
            toast.error(translate("Error inesperado al firmar el documento."))
        } finally {
            setIsSubmitting(false)
        }
    }

    const isImageConsent = documentType === 'Autorización de imagen y vídeo'
    const imageChoices = [
        consentOptions?.portal_internal && 'Portal Familias, Videoteca y Muro Academy',
        consentOptions?.public_communications && 'Web, redes sociales y comunicación pública',
    ].filter((choice): choice is string => Boolean(choice))

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                        <PenLine className="h-6 w-6 text-gold" />
                    </div>
                    <DialogTitle className="text-center text-xl font-black">{translate("Firma de Consentimiento")}</DialogTitle>
                    <DialogDescription className="text-center text-slate-500">
                        {translate(isImageConsent ? `Firma para registrar tu decisión sobre el uso de imagen y vídeo${childName ? ` de ${childName}` : ''}.` : 'Por favor, firma en el recuadro inferior para aceptar las condiciones de inscripción y privacidad:')}
                        <strong className="block mt-1 text-slate-700">{translate(documentType)} {translate(" (v")}{translate(documentVersion)}{translate(")")}</strong>
                        <span className="mt-2 flex justify-center gap-3 text-xs font-bold">{translate(isImageConsent ? <Link href="/autorizacion-imagen" target="_blank" className="text-navy underline hover:text-gold">{translate("Leer autorización completa")}</Link> : <Link href="/terminos" target="_blank" className="text-navy underline hover:text-gold">{translate("Leer condiciones")}</Link>)}<Link href="/privacidad" target="_blank" className="text-navy underline hover:text-gold">{translate("Leer privacidad")}</Link></span>
                    </DialogDescription>
                </DialogHeader>

                {translate(isImageConsent && <div className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs leading-relaxed text-slate-700"><strong className="text-navy">{translate("Decisión que vas a firmar:")}</strong>{translate(imageChoices.length > 0 ? <ul className="mt-1 list-disc space-y-1 pl-4">{translate(imageChoices.map((choice) => <li key={choice}>{translate(choice)}</li>))}</ul> : <p className="mt-1">{translate("No autorizo ningún uso de imagen o vídeo.")}</p>)}</div>)}

                <div className="my-6">
                    <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden" style={{ width: '100%', height: '200px' }}>
                        <SignatureCanvas
                            ref={padRef}
                            canvasProps={{
                                className: 'sigCanvas w-full h-full cursor-crosshair'
                            }}
                            penColor="midnightblue"
                            backgroundColor="rgb(248 250 252)" // slate-50 to match container
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-xs text-slate-400 font-medium">{translate("Usa tu ratón o dedo para firmar")}</span>
                        <button
                            type="button"
                            onClick={clearSignature}
                            className="text-xs font-bold text-navy transition-colors hover:text-gold"
                        >
                            {translate("Limpiar firma")}</button>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 text-xs text-slate-500 leading-relaxed text-center">
                    {translate(isImageConsent ? 'Declaro que soy el tutor legal del jugador. Esta decisión es opcional, se guarda con su fecha y versión, y puedes modificarla o retirarla desde Autorizaciones.' : 'Al firmar declaro que soy el tutor legal y que he leído y acepto las condiciones generales de inscripción y la política de privacidad. La firma, fecha, versión y datos técnicos quedarán registrados como evidencia de aceptación.')}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto font-bold border-slate-200"
                        disabled={isSubmitting}
                    >
                        {translate("Cancelar")}</Button>
                    <Button
                        type="button"
                        onClick={saveSignature}
                        disabled={isSubmitting}
                        className="w-full bg-gold font-bold text-navy hover:bg-gold/80 sm:w-auto"
                    >
                        {translate(isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {translate(" Procesando...")}</>
                        ) : (
                            isImageConsent ? 'Firmar y guardar decisión' : 'Firmar y Aceptar'
                        ))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
