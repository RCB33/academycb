import { requireAdmin } from '@/lib/auth'
import { WallModeration } from './wall-moderation'

export const dynamic = 'force-dynamic'

export default async function AdminWallPage() {
    const { supabase } = await requireAdmin()
    const { data: posts } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false }).limit(100)
    const { data: engagement } = await supabase.rpc('community_post_engagement', { post_ids: (posts || []).filter(p=>p.visibility==='community'&&p.status==='published').map(p=>p.id) })
    return <WallModeration engagement={engagement || []} initialPosts={(posts || []).filter((post) => post.status === 'published')} />
}
