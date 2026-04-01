import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/ui/notification-bell"
import { GlobalSignatureGuard } from "@/components/portal/global-signature-guard"
import { SidebarNav } from "@/components/portal/sidebar-nav"

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/portal')
    }

    // Optional: Check if role is 'guardian' or 'admin'
    // const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    const signOut = async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/')
    }

    return (
        <div className="h-screen flex flex-col md:flex-row bg-muted/20 overflow-hidden w-full">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-background border-b">
                <Link href="/portal/dashboard" className="flex items-center space-x-2 font-bold">
                    <Trophy className="h-5 w-5 text-primary" />
                    <span>Portal</span>
                </Link>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <form action={signOut}>
                        <Button variant="ghost" size="icon"><LogOut className="h-5 w-5" /></Button>
                    </form>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen shrink-0 relative z-20">
                <div className="p-6 border-b shrink-0">
                    <Link href="/portal/dashboard" className="flex items-center space-x-2 font-bold text-xl">
                        <Trophy className="h-6 w-6 text-primary" />
                        <span>Portal Familias</span>
                    </Link>
                </div>
                <SidebarNav />
                <div className="p-4 border-t shrink-0">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.email}</p>
                            </div>
                        </div>
                        <NotificationBell />
                    </div>
                    <form action={signOut}>
                        <Button variant="outline" className="w-full">
                            <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                        </Button>
                    </form>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden relative h-full">
                    <div className="mx-auto w-full max-w-7xl">
                        {children}
                    </div>
                    {/* Add some padding space at the very bottom strictly to prevent cut-offs */}
                    <div className="h-8 shrink-0 w-full" />
                </main>
            </div>

            {/* Global Signature Check */}
            <GlobalSignatureGuard userId={user.id} />
        </div>
    )
}
