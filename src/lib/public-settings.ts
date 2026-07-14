import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type PublicSettings = Record<string, string>

export async function getPublicSettings(): Promise<PublicSettings> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('academy_settings')
        .select('key, value')
        .eq('is_public', true)

    if (error) {
        console.error('Unable to load public academy settings:', error)
        return {}
    }

    return Object.fromEntries(
        (data || [])
            .filter((row): row is { key: string; value: string | null } => Boolean(row.key))
            .map((row) => [row.key, row.value || ''])
    )
}
