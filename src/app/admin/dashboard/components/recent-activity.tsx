import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from '@/lib/supabase/server'
import { Badge } from "@/components/ui/badge"
import { CreditCard, UserPlus, Clock } from "lucide-react"

export async function RecentActivity() {
    const supabase = await createClient()

    // Fetch last 5 payments
    const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    // Fetch last 5 leads
    const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    // Normalize and merge
    const activity = [
        ...(payments || []).map(p => ({
            type: 'payment',
            id: p.id,
            title: `Pago recibido: ${p.amount} €`,
            subtitle: p.status === 'completed' || p.status === 'paid' ? 'Completado' : 'Pendiente',
            date: new Date(p.created_at),
            status: p.status,
            amount: p.amount
        })),
        ...(leads || []).map(l => ({
            type: 'lead',
            id: l.id,
            title: `Nuevo Lead: ${l.child_name}`,
            subtitle: `${l.category_text || 'Sin categoría'} - ${l.phone || 'Sin télefono'}`,
            date: new Date(l.created_at),
            status: l.status || 'new'
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)

    return (
        <Card className="h-full border-none shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-500" />
                    Actividad Reciente
                </CardTitle>
                <CardDescription>
                    Últimos movimientos y registros.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-2">
                <div className="space-y-4">
                    {activity.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">No hay actividad reciente.</p>
                    ) : (
                        activity.map((item) => (
                            <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className={`${item.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {item.type === 'payment' ? <CreditCard className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-slate-400">
                                        {item.date.toLocaleDateString()}
                                    </span>
                                    {item.type === 'payment' && (
                                        <Badge variant="secondary" className="text-[10px] h-5">
                                            {item.status === 'paid' ? 'Pagado' : item.status}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
