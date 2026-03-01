'use client'

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { GuardianDialog } from '../components/guardian-dialog'
import { ResetPasswordButton } from './reset-password-button'

interface Props {
    guardian: any
}

export function TutorProfileActions({ guardian }: Props) {
    return (
        <div className="flex gap-2 flex-wrap justify-end">
            {guardian.user_id && <ResetPasswordButton userId={guardian.user_id} />}

            {guardian.phone && (
                <Button variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100" asChild>
                    <a href={`https://wa.me/${guardian.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                    </a>
                </Button>
            )}

            <GuardianDialog mode="edit" guardian={guardian} />
        </div>
    )
}
