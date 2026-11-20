import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CoachNav } from '@/components/coach/coach-nav'
import { CoachMain } from '@/components/coach/coach-main'

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

    const {data:active}=await supabase.rpc('has_role',{allowed_roles:['coach','admin']})
    if (!active || (profile?.role !== 'coach' && profile?.role !== 'admin')) {
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
            <CoachMain>
                {children}
            </CoachMain>
        </div>
    )
}
