import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

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
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Minimal Mobile Header */}
            <header className="bg-navy text-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
                <Link href="/coach" className="flex items-center space-x-2 font-bold">
                    <Trophy className="h-6 w-6 text-gold" />
                    <span className="tracking-wider uppercase text-sm">Entrenador</span>
                </Link>
                <form action={signOut}>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </form>
            </header>

            <main className="flex-1 overflow-y-auto pb-8">
                {children}
            </main>
        </div>
    )
}
