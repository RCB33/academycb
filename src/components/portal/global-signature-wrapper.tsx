'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignatureModal } from './signature-modal'
import { CONSENT_VERSION, GENERAL_DOCUMENT, type ConsentPlayer } from '@/lib/image-consent'

export function GlobalSignatureWrapper({ guardianId, players, preferencesOnly }: { guardianId: string; players: ConsentPlayer[]; preferencesOnly: boolean }) {
    const [isOpen, setIsOpen] = useState(true)
    const router = useRouter()
    return <SignatureModal isOpen={isOpen} onClose={() => setIsOpen(false)} guardianId={guardianId}
        documentType={GENERAL_DOCUMENT} documentVersion={CONSENT_VERSION} players={players} preferencesOnly={preferencesOnly}
        onSuccess={() => { setIsOpen(false); router.refresh() }} />
}
