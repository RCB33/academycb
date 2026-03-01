'use client'

import { useState } from 'react'
import { SignatureModal } from './signature-modal'

interface GlobalSignatureWrapperProps {
    guardianId: string;
    documentType: string;
    documentVersion: string;
}

export function GlobalSignatureWrapper({ guardianId, documentType, documentVersion }: GlobalSignatureWrapperProps) {
    const [isOpen, setIsOpen] = useState(true)

    // In a real app, you might want to prevent closing unless signed.
    // We'll allow closing for demo purposes, but the guard will catch them on next reload.

    return (
        <SignatureModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)} // User can dismiss, but will be annoyed next reload. Or force them to sign by not providing onClose in a strict mode.
            guardianId={guardianId}
            documentType={documentType}
            documentVersion={documentVersion}
            onSuccess={() => setIsOpen(false)}
        />
    )
}
