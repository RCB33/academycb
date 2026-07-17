import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Password recovery must also work when the email is opened in a different
 * browser or on another device. A short-lived implicit recovery link carries
 * the recovery session in the URL fragment; the normal application client
 * remains PKCE-based for every other authentication operation.
 */
export function createRecoveryClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
