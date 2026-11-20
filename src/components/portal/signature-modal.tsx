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
import { createSignature, saveImageConsentChoices } from '@/app/actions/signatures'
import { toast } from 'sonner'
import { Loader2, PenLine } from 'lucide-react'
import Link from 'next/link'
import { type ConsentPlayer } from '@/lib/image-consent'

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    guardianId: string;
    documentType: string;
    documentVersion: string;
    childId?: string;
    childName?: string;
    consentOptions?: { portal_internal: boolean; public_communications: boolean };
    players?: ConsentPlayer[];
    preferencesOnly?: boolean;
    onSuccess: (choices?: { childId: string; options: ConsentPlayer['options'] }[]) => void;
}

export function SignatureModal({ isOpen, onClose, guardianId, documentType, documentVersion, childId, childName, consentOptions, players, preferencesOnly = false, onSuccess }: SignatureModalProps) {
    const translate = useT()

    const padRef = useRef<SignatureCanvas>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [choices, setChoices] = useState((players || []).map(p => ({ childId: p.id, options: { ...p.options } })))
    const [confirmed, setConfirmed] = useState(false)

    const clearSignature = () => {
        padRef.current?.clear()
    }

    const saveSignature = async () => {
        if (players && !confirmed) { toast.error(translate('Confirma las opciones antes de continuar.')); return }
        if (!preferencesOnly && (!padRef.current || padRef.current.isEmpty())) {
            toast.error(translate("Por favor, proporciona tu firma."))
            return
        }

        setIsSubmitting(true)
        const signatureBase64 = preferencesOnly ? undefined : padRef.current!.getTrimmedCanvas().toDataURL('image/png')

        try {
            const result = preferencesOnly ? await saveImageConsentChoices({ guardianId, choices, confirmed }) : await createSignature({
                guardianId,
                documentType,
                documentVersion,
                childId,
                consentOptions,
                signatureBase64,
                playerConsents: players ? choices : undefined,
                confirmed,
            })

            if (result.success) {
                toast.success(translate(preferencesOnly ? 'Preferencias guardadas.' : 'Bienvenida y autorizaciones guardadas con una sola firma.'))
                onSuccess(choices)
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
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg bg-white border-none shadow-2xl">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                        <PenLine className="h-6 w-6 text-gold" />
                    </div>
                    <DialogTitle className="text-center text-xl font-black">{translate(preferencesOnly ? 'Tus permisos de imagen' : players ? 'Bienvenida · una sola firma' : 'Firma de Consentimiento')}</DialogTitle>
                    <DialogDescription className="text-center text-slate-500">
                        {translate(preferencesOnly ? 'Tu firma inicial sigue registrada. Elige o cambia los permisos aquí, sin volver a firmar.' : players ? 'Revisa las condiciones y elige los permisos de cada hijo. Una sola firma guarda las condiciones y estas decisiones.' : isImageConsent ? `Firma para registrar tu decisión sobre el uso de imagen y vídeo${childName ? ` de ${childName}` : ''}.` : 'Por favor, firma en el recuadro inferior para aceptar las condiciones de inscripción y privacidad:')}
                        <strong className="block mt-1 text-slate-700">{translate(preferencesOnly ? "Autorización de imagen y vídeo" : documentType)} {translate(" (v")}{translate(documentVersion)}{translate(")")}</strong>
                        <span className="mt-2 flex justify-center gap-3 text-xs font-bold">{translate(isImageConsent || preferencesOnly ? <Link href="/autorizacion-imagen" target="_blank" className="text-navy underline hover:text-gold">{translate("Leer autorización completa")}</Link> : <Link href="/terminos" target="_blank" className="text-navy underline hover:text-gold">{translate("Leer condiciones")}</Link>)}<Link href="/privacidad" target="_blank" className="text-navy underline hover:text-gold">{translate("Leer privacidad")}</Link></span>
                    </DialogDescription>
                </DialogHeader>

                {translate(isImageConsent && <div className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs leading-relaxed text-slate-700"><strong className="text-navy">{translate("Decisión que vas a firmar:")}</strong>{translate(imageChoices.length > 0 ? <ul className="mt-1 list-disc space-y-1 pl-4">{translate(imageChoices.map((choice) => <li key={choice}>{translate(choice)}</li>))}</ul> : <p className="mt-1">{translate("No autorizo ningún uso de imagen o vídeo.")}</p>)}</div>)}

                {players && <div className="space-y-4">
                    <p className="text-xs text-slate-600">{translate('Los permisos de imagen son opcionales. No marcar una opción significa no autorizarla. Podrás cambiarlos o retirarlos después.')} <Link href="/autorizacion-imagen" target="_blank" className="font-bold underline">{translate('Leer autorización completa')}</Link></p>
                    {players.map(player => <fieldset key={player.id} className="space-y-3 rounded-xl border border-slate-200 p-4"><legend className="px-1 font-bold text-navy">{player.fullName}</legend>
                        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 accent-gold" checked={choices.find(c => c.childId === player.id)?.options.portal_internal || false} onChange={e => { setConfirmed(false); setChoices(old => old.map(c => c.childId === player.id ? { ...c, options: { ...c.options, portal_internal: e.target.checked } } : c)) }} /><span><strong>{translate('Uso interno en el portal')}</strong><br/>{translate('Fotos y vídeos en Portal Familias, Videoteca y Muro Academy. En cada publicación eliges si compartir con la comunidad o solo con tu familia y Academy.')}</span></label>
                        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 accent-gold" checked={choices.find(c => c.childId === player.id)?.options.public_communications || false} onChange={e => { setConfirmed(false); setChoices(old => old.map(c => c.childId === player.id ? { ...c, options: { ...c.options, public_communications: e.target.checked } } : c)) }} /><span><strong>{translate('Uso público por Academy')}</strong><br/>{translate('Web, redes sociales y materiales promocionales. Es independiente de compartir en el muro privado.')}</span></label>
                    </fieldset>)}
                    <label className="flex items-start gap-3 rounded-xl bg-gold/10 p-3 text-sm"><input type="checkbox" className="mt-1 accent-gold" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>{translate(preferencesOnly ? 'Confirmo que soy el tutor y quiero guardar estas decisiones.' : 'He leído las condiciones y la privacidad. Confirmo las decisiones de imagen indicadas, incluidas las opciones que no autorizo.')}</span></label>
                </div>}

                {!preferencesOnly && <div className="my-6">
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
                </div>}

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 text-xs text-slate-500 leading-relaxed text-center">
                    {translate(preferencesOnly ? 'Cada cambio queda registrado con fecha, versión y tu cuenta de tutor. No se modifica ninguna firma anterior.' : isImageConsent ? 'Declaro que soy el tutor legal del jugador. Esta decisión es opcional, se guarda con su fecha y versión, y puedes modificarla o retirarla desde Autorizaciones.' : 'Al firmar declaro que soy el tutor legal y que he leído y acepto las condiciones generales de inscripción y la política de privacidad. La firma, fecha, versión y datos técnicos quedarán registrados como evidencia de aceptación.')}
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
                        disabled={isSubmitting || Boolean(players && !confirmed)}
                        className="w-full bg-gold font-bold text-navy hover:bg-gold/80 sm:w-auto"
                    >
                        {translate(isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {translate(" Procesando...")}</>
                        ) : (
                            preferencesOnly ? 'Guardar permisos' : players ? 'Firmar una vez y continuar' : isImageConsent ? 'Firmar y guardar decisión' : 'Firmar y Aceptar'
                        ))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
