import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CoachNav } from '@/components/coach/coach-nav'

export default async function CoachLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/portal')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'coach' && profile?.role !== 'admin' && profile?.role !== 'staff') {
        redirect('/portal')
    }

    const signOut = async () => {
        'use server'
        const sb = await createClient()
        await sb.auth.signOut()
        redirect('/')
    }

    return (
        <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-slate-50">
            <CoachNav signOut={signOut} />
            <main className="flex-1 overflow-y-auto overscroll-y-contain pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-8">
                {children}
            </main>
        </div>
    )
}
