import { createClient } from '@/lib/supabase/server'
import { Receipt, Calendar, CreditCard, ShoppingBag, GraduationCap, Tent, Trophy as TrophyIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { redirect } from 'next/navigation'

export default async function PagosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/portal')

    // 1. Get guardian and children ids
    const { data: guardian } = await supabase
        .from('guardians')
        .select('id, child_guardians(child_id)')
        .eq('user_id', user.id)
        .single()
        
    const childIds = guardian?.child_guardians?.map((cg: any) => cg.child_id) || []

    // 2. Fetch payments for those children (Admin assigned payments/fees)
    let academyPayments: any[] = []
    if (childIds.length > 0) {
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .in('child_id', childIds)
        academyPayments = payments || []
    }

    // 3. Fetch orders (Store purchases)
    const { data: orders } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('customer_email', user.email)

    // 4. Combine and sort
    const allTransactions = [
        ...academyPayments.map(p => ({
            id: p.id,
            type: p.type || 'academy', // academy, campus, tournament, other
            title: p.description || 'Cuota de Academia',
            amount: p.amount,
            status: p.status,
            date: p.created_at,
            method: p.method || 'transferencia',
            items: null,
            isStore: false
        })),
        ...(orders || []).map(o => ({
            id: o.id,
            type: 'shop',
            title: `Pedido Tienda #${o.id.slice(0,8).toUpperCase()}`,
            amount: o.total_amount,
            status: o.status,
            date: o.created_at,
            method: 'tarjeta',
            items: o.order_items,
            isStore: true
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Helper for icons
    const getIcon = (type: string) => {
        switch (type) {
            case 'academy': return <GraduationCap className="h-6 w-6" />;
            case 'campus': return <Tent className="h-6 w-6" />;
            case 'tournament': return <TrophyIcon className="h-6 w-6" />;
            case 'shop': return <ShoppingBag className="h-6 w-6" />;
            default: return <Receipt className="h-6 w-6" />;
        }
    }
    const getColor = (type: string) => {
        switch (type) {
            case 'academy': return 'bg-blue-50/80 text-blue-600 border-blue-100';
            case 'campus': return 'bg-green-50/80 text-green-600 border-green-100';
            case 'tournament': return 'bg-yellow-50/80 text-yellow-600 border-yellow-100';
            case 'shop': return 'bg-purple-50/80 text-purple-600 border-purple-100';
            default: return 'bg-slate-50/80 text-slate-600 border-slate-100';
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-navy">Mis Pagos e Historial</h1>
            
            <div className="space-y-4">
                {allTransactions && allTransactions.length > 0 ? (
                    allTransactions.map((tx: any) => (
                        <Card key={tx.id} className="overflow-hidden shadow-sm hover:shadow-md transition-all bg-white border">
                            <CardContent className="p-0">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6">
                                    <div className="flex items-start gap-4 w-full">
                                        <div className={`p-3 rounded-full shrink-0 shadow-sm border ${getColor(tx.type)}`}>
                                            {getIcon(tx.type)}
                                        </div>
                                        <div className="flex-1 w-full">
                                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                {tx.title}
                                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider ${tx.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {tx.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                                </span>
                                            </h3>
                                            <div className="flex flex-wrap items-center text-sm font-medium text-slate-500 mt-1 gap-x-4 gap-y-2">
                                                <span className="flex items-center"><Calendar className="mr-1.5 h-4 w-4 text-slate-400"/> {new Date(tx.date).toLocaleDateString()}</span>
                                                <span className="flex items-center"><CreditCard className="mr-1.5 h-4 w-4 text-slate-400"/> Método: <span className="capitalize ml-1">{tx.method}</span></span>
                                            </div>
                                            
                                            {tx.items && tx.items.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 w-full text-sm">
                                                    <p className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-1">Artículos</p>
                                                    {tx.items.map((item: any) => (
                                                        <div key={item.id} className="flex justify-between items-center bg-slate-50 py-1.5 px-3 rounded-md">
                                                            <span className="font-medium text-slate-700">
                                                                <span className="text-indigo-600 font-bold mr-2">{item.quantity}x</span> 
                                                                {item.product_name} {item.size ? <span className="text-slate-500 text-xs ml-1 border rounded px-1">Talla: {item.size}</span> : ''}
                                                            </span>
                                                            <span className="text-slate-600 font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-6 flex flex-col items-end sm:items-center justify-center w-full sm:w-auto shrink-0 min-w-[140px]">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 w-full text-right sm:text-center">Total abonado</p>
                                        <div className="text-3xl font-black text-slate-900 tracking-tight w-full text-right sm:text-center">{tx.amount?.toFixed(2)} €</div>
                                        
                                        {tx.isStore && (
                                            <a href={`/portal/tienda`} className="mt-3 text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center justify-center w-full py-2 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors">
                                                Volver a Tienda
                                            </a>
                                        )}
                                        {!tx.isStore && tx.status !== 'paid' && (
                                            <div className="mt-3 text-xs font-bold text-amber-600 flex items-center justify-center w-full py-2 bg-amber-50 rounded-md">
                                                Contactar Administración
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="py-16 text-center text-slate-500 bg-white rounded-xl border-2 border-dashed shadow-sm border-slate-200 flex flex-col items-center justify-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <Receipt className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Sin Transacciones</h3>
                        <p className="max-w-md mx-auto">Todavía no tienes historial de compras o pagos registrados en la academia.</p>
                        <a href="/portal/tienda" className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                            Visitar Tienda Oficial
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
