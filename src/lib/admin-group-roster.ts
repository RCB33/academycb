import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminReadAll } from '@/lib/admin-read-all'

// The RPC checks the administrator role and excludes archived/expired assignments.
export async function adminGroupPlayerLinks(supabase: SupabaseClient) {
  const { data } = await adminReadAll<{child_id:string;team_id:string}>((from,to) =>
    supabase.rpc('admin_group_player_links').order('team_id').order('child_id').range(from,to))
  return data
}
