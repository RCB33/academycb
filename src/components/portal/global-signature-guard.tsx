import { createClient } from '@/lib/supabase/server'
import { hasSignedDocument } from '@/app/actions/signatures'
import { GlobalSignatureWrapper } from './global-signature-wrapper'

export async function GlobalSignatureGuard({ userId }: { userId: string }) {
    const supabase = await createClient()

    // 1. Get Guardian ID
    const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (!guardian) {
        return null; // Not a guardian, no signature needed here
    }

    // 2. Check if signed
    const docType = 'Condiciones Generales Academia'
    const docVersion = '1.0'
    const hasSigned = await hasSignedDocument(guardian.id, docType, docVersion)

    // 3. Render client wrapper if not signed
    if (!hasSigned) {
        return (
            <GlobalSignatureWrapper
                guardianId={guardian.id}
                documentType={docType}
                documentVersion={docVersion}
            />
        )
    }

    return null
}
