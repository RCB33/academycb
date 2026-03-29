import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MessageSquare, Bell, Calendar as CalendarIcon, Share2, Megaphone } from "lucide-react"
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ComunicadosWallPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/portal')

    // Get basic guardian
    const { data: guardian } = await supabase.from('guardians').select('id').eq('user_id', user.id).single()
    
    if (!guardian) {
        return (
            <div className="text-center py-20">
                <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Muro de Comunicados</h2>
                <p className="text-muted-foreground">Tu usuario no está asociado a ningún tutor para ver los comunicados.</p>
            </div>
        )
    }

    // Get children to know which categories to filter
    const { data: relations } = await supabase
        .from('child_guardians')
        .select('child:children(category:categories(name), team:teams(name))')
        .eq('guardian_id', guardian.id)

    // Collect relevant labels (category names, team names, or 'Todos')
    const labels = new Set<string>()
    labels.add('Todos') // Always allow general messages
    labels.add('Academia') // Another common default name if nothing selected
    
    relations?.forEach(r => {
        const c = r.child as any
        if (c?.category?.name) labels.add(c.category.name)
        if (c?.team?.name) labels.add(c.team.name)
    })

    const allowedLabels = Array.from(labels)

    // Fetch broadcast logs that match these categories
    // broadcast_logs doesn't have a direct 'Todos' sometimes, but we'll fetch everything that matches allowedLabels
    // Alternatively, we can just fetch all if it's a small academy, but filtering is better.
    const { data: messages } = await supabase
        .from('broadcast_logs')
        .select('*')
        .in('category_name', allowedLabels)
        .order('created_at', { ascending: false })
        .limit(30) // Last 30 messages

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Megaphone className="h-8 w-8 text-yellow-500" />
                        Muro de Comunicados
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">Noticias y avisos oficiales de la academia y tus equipos.</p>
                </div>
            </div>

            <div className="space-y-6 mt-8">
                {(!messages || messages.length === 0) ? (
                    <Card className="border-dashed border-2 bg-slate-50 border-slate-200">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <Bell className="h-12 w-12 text-slate-300 mb-4 opacity-50" />
                            <p className="text-slate-500 font-bold text-lg">No hay comunicados recientes</p>
                            <p className="text-slate-400 text-sm mt-1">Los avisos importantes aparecerán aquí.</p>
                        </CardContent>
                    </Card>
                ) : (
                    messages.map((msg) => (
                        <Card key={msg.id} className="border-none shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
                            <div className="h-2 w-full bg-yellow-400" />
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <span className="text-lg">📢</span>
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-slate-900">
                                                Aviso del Club
                                            </CardTitle>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                                                <CalendarIcon className="h-3 w-3" />
                                                {new Date(msg.created_at).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                <span className="w-1 h-1 bg-slate-300 rounded-full mx-1" />
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] border border-slate-200">
                                                    Para: {msg.category_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="text-slate-300 hover:text-slate-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {msg.message}
                                </p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
