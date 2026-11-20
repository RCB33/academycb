import { createClient } from '@/lib/supabase/server'
import { GlobalSignatureWrapper } from './global-signature-wrapper'
import { GENERAL_DOCUMENT, IMAGE_DOCUMENT, NO_IMAGE_CONSENT, type ConsentPlayer } from '@/lib/image-consent'

export async function GlobalSignatureGuard({ userId }: { userId: string }) {
    const db = await createClient()
    const { data: guardian, error } = await db.from('guardians').select('id').eq('user_id', userId).maybeSingle()
    if (error) throw new Error('No se pudieron consultar las autorizaciones.')
    if (!guardian) return null
    const [records, links] = await Promise.all([
        db.from('signatures').select('child_id,document_type,consent_options').eq('guardian_id', guardian.id).order('signed_at', { ascending: false }).order('id', { ascending: false }),
        db.from('child_guardians').select('child:children(id,full_name,archived_at)').eq('guardian_id', guardian.id),
    ])
    if (records.error || links.error) throw new Error('No se pudieron consultar las autorizaciones.')
    // Existing signatures stay valid. We never force families to draw a second one.
    const hasSigned = records.data.some(s => s.document_type === GENERAL_DOCUMENT)
    const players: ConsentPlayer[] = links.data.flatMap(link => {
        const child = Array.isArray(link.child) ? link.child[0] : link.child
        if (!child || child.archived_at) return []
        const consent = records.data.find(s => s.child_id === child.id && s.document_type === IMAGE_DOCUMENT)
        if (hasSigned && consent) return []
        return [{ id: child.id, fullName: child.full_name, options: consent?.consent_options || NO_IMAGE_CONSENT }]
    })
    if (hasSigned && !players.length) return null
    return <GlobalSignatureWrapper guardianId={guardian.id} players={players} preferencesOnly={hasSigned} />
}
