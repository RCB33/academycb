import { operationalLog } from '@/lib/operational-log'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
    if (request.headers.get('origin') !== new URL(request.url).origin) {
        return new Response(null, { status: 403 })
    }
    let userId: string
    try {
        const { user } = await requireRole(['guardian'])
        userId = user.id
    } catch {
        return new Response(null, { status: 403 })
    }
    try {
        const { error } = await createAdminClient().rpc('record_guardian_portal_visit', { p_user_id: userId })
        if (error) { operationalLog('portal.visit_failed',{source:'portal',status:503}); return new Response(null, { status: 503 }) }
        return new Response(null, { status: 204 })
    } catch {
        operationalLog('portal.visit_failed',{source:'portal',status:503})
        return new Response(null, { status: 503 })
    }
}
