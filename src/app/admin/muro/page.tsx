import { requireAdmin } from '@/lib/auth'
import { WallModeration } from './wall-moderation'

export const dynamic = 'force-dynamic'

export default async function AdminWallPage() {
    const { supabase } = await requireAdmin()
    const { data: posts } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false }).limit(100)
    return <WallModeration initialPosts={(posts || []).filter((post) => post.status === 'published')} />
}
