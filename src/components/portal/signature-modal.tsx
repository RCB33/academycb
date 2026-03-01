'use client'

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

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    guardianId: string;
    documentType: string;
    documentVersion: string;
    onSuccess: () => void;
}

export function SignatureModal({ isOpen, onClose, guardianId, documentType, documentVersion, onSuccess }: SignatureModalProps) {
    const padRef = useRef<SignatureCanvas>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const clearSignature = () => {
        padRef.current?.clear()
    }

    const saveSignature = async () => {
        if (!padRef.current || padRef.current.isEmpty()) {
            toast.error("Por favor, proporciona tu firma.")
            return
        }

        setIsSubmitting(true)
        const signatureBase64 = padRef.current.getTrimmedCanvas().toDataURL('image/png')

        try {
            const result = await createSignature({
                guardianId,
                documentType,
                documentVersion,
                signatureBase64
            })

            if (result.success) {
                toast.success("Documento firmado correctamente.")
                onSuccess()
                onClose()
            } else {
                toast.error(result.error || "Error al guardar la firma.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado al firmar el documento.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
                <DialogHeader>
                    <div className="mx-auto bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                        <PenLine className="h-6 w-6 text-indigo-600" />
                    </div>
                    <DialogTitle className="text-center text-xl font-black">Firma de Consentimiento</DialogTitle>
                    <DialogDescription className="text-center text-slate-500">
                        Por favor, firma en el recuadro inferior para aceptar las condiciones del documento:
                        <strong className="block mt-1 text-slate-700">{documentType} (v{documentVersion})</strong>
                    </DialogDescription>
                </DialogHeader>

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
                        <span className="text-xs text-slate-400 font-medium">Usa tu ratón o dedo para firmar</span>
                        <button
                            type="button"
                            onClick={clearSignature}
                            className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                        >
                            Limpiar firma
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 text-xs text-slate-500 leading-relaxed text-center">
                    Al firmar este documento, certifico que soy el tutor legal y acepto todas las cláusulas establecidas en los términos de la academia. Entiendo que esta firma digital tiene plena validez legal.
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto font-bold border-slate-200"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={saveSignature}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                        ) : (
                            "Firmar y Aceptar"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
