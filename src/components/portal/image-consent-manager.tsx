'use client'
import { useT } from '@/lib/i18n/client'


import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CONSENT_VERSION, GENERAL_DOCUMENT } from '@/lib/image-consent'
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
    const router = useRouter()

    function startDecision(child: ChildConsent) {
        setSigningChild(child)
        setOptions(child.consent?.consent_options || EMPTY_OPTIONS)
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

        {signingChild && <SignatureModal isOpen onClose={() => setSigningChild(null)} guardianId={guardianId}
            documentType={GENERAL_DOCUMENT} documentVersion={CONSENT_VERSION} preferencesOnly
            players={[{ id: signingChild.id, fullName: signingChild.fullName, options }]}
            onSuccess={() => { setSigningChild(null); router.refresh() }} />}
    </div>
}
