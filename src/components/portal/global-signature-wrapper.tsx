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

    return (
        <SignatureModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            guardianId={guardianId}
            documentType={documentType}
            documentVersion={documentVersion}
            onSuccess={() => setIsOpen(false)}
        />
    )
}
