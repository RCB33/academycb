'use client'
import { useT } from '@/lib/i18n/client'


import { useState } from 'react'
import { Camera, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignatureModal } from './signature-modal'

type ConsentOptions = { portal_internal: boolean; public_communications: boolean }
type ChildConsent = {
    id: string
    fullName: string
    consent?: { consent_options?: ConsentOptions | null; signed_at: string; document_version: string } | null
}

const EMPTY_OPTIONS: ConsentOptions = { portal_internal: false, public_communications: false }

export function ImageConsentManager({ guardianId, players }: { guardianId: string; players: ChildConsent[] }) {
    const translate = useT()

    const [signingChild, setSigningChild] = useState<ChildConsent | null>(null)
    const [options, setOptions] = useState<ConsentOptions>(EMPTY_OPTIONS)
    const [showSignature, setShowSignature] = useState(false)

    function startDecision(child: ChildConsent) {
        setSigningChild(child)
        setOptions(child.consent?.consent_options || EMPTY_OPTIONS)
        setShowSignature(false)
    }

    return <div className="grid gap-5 lg:grid-cols-2">
        {translate(players.map((child) => {
            const current = child.consent?.consent_options || EMPTY_OPTIONS
            const hasConsent = current.portal_internal || current.public_communications
            return <article key={child.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-navy px-5 py-4 text-white">
                    <div className="flex items-center gap-3"><span className="rounded-xl bg-gold/20 p-2 text-gold"><Camera className="h-5 w-5" /></span><div><h2 className="font-heading text-lg font-black">{translate(child.fullName)}</h2><p className="text-xs text-white/70">{translate("Autorización de imagen y vídeo")}</p></div></div>
                </div>
                <div className="space-y-4 p-5 text-sm text-slate-600">
                    <div className={`flex items-start gap-2 rounded-xl p-3 ${hasConsent ? 'bg-green-50 text-green-800' : 'bg-slate-50 text-slate-700'}`}><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>{translate(hasConsent ? `${translate("Autorización registrada")}${child.consent ? ` · v${child.consent.document_version}` : ''}` : 'Sin autorización de imagen activa')}</span></div>
                    <ul className="space-y-2 text-xs leading-relaxed"><li className="flex gap-2"><CheckCircle2 className={`h-4 w-4 shrink-0 ${current.portal_internal ? 'text-green-600' : 'text-slate-300'}`} />{translate("Portal Familias, Videoteca y Muro Academy: ")}<strong>{translate(current.portal_internal ? 'Autorizado' : 'No autorizado')}</strong></li><li className="flex gap-2"><CheckCircle2 className={`h-4 w-4 shrink-0 ${current.public_communications ? 'text-green-600' : 'text-slate-300'}`} />{translate("Web, redes sociales y comunicación pública: ")}<strong>{translate(current.public_communications ? 'Autorizado' : 'No autorizado')}</strong></li></ul>
                    <Button type="button" variant={hasConsent ? 'outline' : 'default'} className={hasConsent ? 'w-full border-navy text-navy hover:bg-navy hover:text-white' : 'w-full bg-gold font-bold text-navy hover:bg-gold/80'} onClick={() => startDecision(child)}>{translate(hasConsent ? 'Modificar o retirar autorización' : 'Decidir autorización')}</Button>
                </div>
            </article>
        }))}

        {translate(signingChild && !showSignature && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
                <h2 className="font-heading text-xl font-black text-navy">{translate("Decidir autorizaciones")}</h2>
                <p className="mt-1 text-sm text-slate-500">{translate("Elige de forma independiente dónde permites usar la imagen de ")}{translate(signingChild.fullName)}{translate(". Ambas opciones parten desactivadas.")}</p>
                <div className="mt-5 space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={options.portal_internal} onChange={(event) => setOptions((value) => ({ ...value, portal_internal: event.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" /><span className="text-sm text-slate-700"><strong className="block text-navy">{translate("Uso interno privado")}</strong>{translate("Portal Familias, Videoteca y Muro Academy.")}</span></label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={options.public_communications} onChange={(event) => setOptions((value) => ({ ...value, public_communications: event.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" /><span className="text-sm text-slate-700"><strong className="block text-navy">{translate("Comunicación pública")}</strong>{translate("Web, redes sociales, prensa y materiales promocionales.")}</span></label>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">{translate("La decisión es opcional. Si no marcas ninguna, quedará registrada como no autorizada. Podrás volver aquí y retirarla cuando quieras.")}</p>
                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setSigningChild(null)}>{translate("Cancelar")}</Button><Button className="bg-gold font-bold text-navy hover:bg-gold/80" onClick={() => setShowSignature(true)}>{translate("Continuar a la firma")}</Button></div>
            </div>
        </div>)}
        {translate(signingChild && <SignatureModal isOpen={showSignature} onClose={() => { setShowSignature(false); setSigningChild(null) }} guardianId={guardianId} childId={signingChild.id} childName={signingChild.fullName} documentType="Autorización de imagen y vídeo" documentVersion="2026.08" consentOptions={options} onSuccess={() => { setSigningChild(null); window.location.reload() }} />)}
    </div>
}
