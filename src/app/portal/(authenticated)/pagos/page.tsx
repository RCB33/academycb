import { createClient } from '@/lib/supabase/server'
import { Receipt, Calendar, CreditCard, ShoppingBag, GraduationCap, Tent, Trophy as TrophyIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { redirect } from 'next/navigation'
import { PortalPageHeader } from '@/components/portal/portal-page-header'
import { PayReceiptButton } from './pay-button'
import { validatePaymentEnvironment } from '@/lib/payment-rules'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConfirmationRefresh } from '@/app/admin/stripe/confirmation-refresh'
import { AcademyOption } from './academy-option'
import { CancelCheckout } from './cancel-checkout'

export default async function PagosPage({ searchParams }: { searchParams: Promise<{ attempt?: string; contract?: string; cancelled?: string }> }) {
    const params = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/portal')
    let checkoutMode: 'test' | 'live' | null = null
    try { checkoutMode = validatePaymentEnvironment({ key: process.env.STRIPE_SECRET_KEY, deployment: process.env.VERCEL_ENV, liveEnabled: process.env.STRIPE_LIVE_PAYMENTS_ENABLED, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET }) } catch { /* No online button until configured. */ }
    const { data: attempts } = await supabase.from('receipt_checkout_attempts').select('id,payment_id,state,mode').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(100)
    const returnedAttempt = attempts?.find(a => a.id === params.attempt)

    // 1. Get guardian and children ids
    const { data: guardians } = await supabase
        .from('guardians')
        .select('id, child_guardians(child_id)')
        .eq('user_id', user.id)
        
    const childIds = [...new Set(guardians?.flatMap(g => g.child_guardians?.map((cg: any) => cg.child_id) || []) || [])]
    const { data: memberships } = childIds.length ? await supabase.from('academy_memberships').select('id,child_id,plan:membership_plans(name,is_active,full_payment_enabled,full_payment_price,monthly_payment_enabled,monthly_payment_price,duration_months,enrollment_fee)').in('child_id', childIds).eq('status','active') : { data: [] }
    const { data: contracts } = await supabase.from('academy_checkout_contracts').select('id,membership_id,state,mode,choice,months,unit_cents,fee_cents,total_cents,billing_status,academy_contract_collections(id,amount_cents)').eq('owner_id',user.id).eq('mode',checkoutMode || 'test').not('state','in','(expired,cancelled)')
    const returnedContract = contracts?.find(c=>c.id===params.contract)

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

    // These order IDs already passed the caller's RLS and email filter. Only
    // resolve the receipt IDs here; the payment RPC independently checks ownership.
    const orderIds = (orders || []).map(o => o.id)
    const { data: orderReceipts } = orderIds.length ? await createAdminClient().from('payments').select('id,ref_id,status,method').eq('type', 'shop').in('ref_id', orderIds) : { data: [] }

    // 4. Combine and sort
    const allTransactions = [
        ...academyPayments.map(p => ({
            id: p.id,
            type: p.type || 'academy', // academy, campus, tournament, other
            title: p.description || 'Cuota de Academia',
            amount: p.amount,
            status: p.status,
            date: p.created_at,
            method: p.method || 'Sin asignar',
            items: null,
            isStore: false
            ,paymentId: p.id
            ,membershipId: p.type === 'academy' ? p.ref_id : null
        })),
        ...(orders || []).map(o => ({
            id: o.id,
            type: 'shop',
            title: `Pedido Tienda #${o.id.slice(0,8).toUpperCase()}`,
            amount: o.total_amount,
            status: orderReceipts?.find(p => p.ref_id === o.id)?.status || o.status,
            date: o.created_at,
            method: orderReceipts?.find(p => p.ref_id === o.id)?.method || o.payment_method || 'Sin asignar',
            items: o.order_items,
            isStore: true
            ,paymentId: orderReceipts?.find(p => p.ref_id === o.id)?.id
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
            <PortalPageHeader icon={<Receipt className="h-6 w-6" />} title="Pagos" description="Consulta cuotas, inscripciones y compras asociadas a tu familia." />
            {checkoutMode === 'test' && <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm"><strong>Entorno de pruebas.</strong> Usa únicamente tarjetas de prueba de Stripe. No se cobra dinero ni se modifican los recibos reales.</div>}
            {returnedAttempt?.state === 'paid' && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{returnedAttempt.mode === 'test' ? 'Prueba confirmada correctamente. Tu recibo real sigue sin cambios.' : 'Pago confirmado. El recibo se ha actualizado correctamente.'}</p>}
            {returnedAttempt && <ConfirmationRefresh pending={['creating','open'].includes(returnedAttempt.state) && !params.cancelled} />}
            {params.cancelled && <p className="rounded-xl border p-4 text-sm">Has vuelto sin finalizar el pago. No se ha marcado como abonado por regresar a esta página.</p>}
            {returnedContract && <><p role="status" className="rounded-xl border p-4 text-sm">{returnedContract.state === 'completed' ? 'Contrato pagado por completo.' : returnedContract.state === 'active' ? 'Mensualidades activadas. Los cobros terminarán automáticamente al finalizar el periodo contratado.' : 'Estamos confirmando tu contrato con Stripe.'}{checkoutMode === 'test' ? ' Simulación: no se ha cobrado dinero real.' : ''}</p><ConfirmationRefresh pending={['creating','open'].includes(returnedContract.state) && !params.cancelled} /></>}
            {checkoutMode && (memberships || []).map((m: any)=>{
                const plan = m.plan
                const contract = contracts?.find(c=>c.membership_id===m.id)
                if(contract) return <section key={m.id} className="space-y-3 rounded-2xl border bg-white p-5">
                    <h2 className="font-bold text-navy">{plan?.name || 'Academia'} · Plan de pago</h2>
                    <p>{contract.choice === 'monthly' ? `${contract.months} mensualidades de ${(Number(contract.unit_cents)/100).toFixed(2)} €` : 'Pago completo'} · Total {(Number(contract.total_cents)/100).toFixed(2)} €</p>
                    <p className="text-sm text-slate-600">{({creating:'Preparando',open:'Pendiente de autorización',active:'Activado',completed:'Pagado por completo'} as Record<string,string>)[contract.state] || contract.state}{checkoutMode === 'test' ? ' · Solo pruebas' : ''}</p>
                    <p className="text-sm">Cobros confirmados: {contract.academy_contract_collections?.length || 0} de {contract.choice==='monthly' ? contract.months : 1}.</p>
                    {contract.billing_status==='attention' && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay una cuota pendiente o una autorización bancaria por completar. Contacta con Academy para revisar el pago. No contrates otro plan.</p>}
                    {contract.billing_status==='ended' && <p className="text-sm">La programación de cobros ha finalizado.{contract.state!=='completed' ? ' Quedan importes por revisar con Academy.' : ''}</p>}
                    {['creating','open'].includes(contract.state) && <AcademyOption membershipId={m.id} choice={contract.choice} amount={Number(contract.unit_cents)/100} fee={Number(contract.fee_cents)/100} months={contract.months} test={checkoutMode==='test'} />}
                    {contract.state==='open' && <CancelCheckout kind="academy" id={contract.id} />}
                </section>
                if(!plan?.is_active || (!plan.full_payment_enabled && !plan.monthly_payment_enabled) || academyPayments.some(p=>p.ref_id===m.id && ['paid','refunded'].includes(p.status))) return null
                return <section key={m.id} className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold text-navy">{plan.name} · Elige cómo pagar</h2><div className="grid gap-4 sm:grid-cols-2">{plan.full_payment_enabled && <AcademyOption membershipId={m.id} choice="full" amount={Number(plan.full_payment_price)} fee={Number(plan.enrollment_fee || 0)} months={plan.duration_months} test={checkoutMode==='test'} />}{plan.monthly_payment_enabled && <AcademyOption membershipId={m.id} choice="monthly" amount={Number(plan.monthly_payment_price)} fee={Number(plan.enrollment_fee || 0)} months={plan.duration_months} test={checkoutMode==='test'} />}</div></section>
            })}
            
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
                                        <div className="min-w-0 flex-1 w-full">
                                            <h3 className="font-bold text-slate-800 text-lg flex flex-wrap items-center gap-2 break-words">
                                                {tx.title}
                                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider ${tx.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {({ paid: 'Pagado', pending: 'Pendiente', failed: 'Fallido', cancelled: 'Cancelado', refunded: 'Reembolsado', shipped: 'Enviado', completed: 'Completado', overdue: 'Vencido' } as Record<string, string>)[tx.status] || 'Por revisar'}
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
                                                                <span className="mr-2 font-bold text-gold">{item.quantity}x</span>
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
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 w-full text-right sm:text-center">{tx.status === 'paid' ? 'Total abonado' : tx.status === 'refunded' ? 'Importe reembolsado' : 'Importe'}</p>
                                        <div className="text-3xl font-black text-slate-900 tracking-tight w-full text-right sm:text-center">{Number(tx.amount || 0).toFixed(2)} €</div>
                                        
                                        {tx.isStore && (
                                            <a href="/portal/tienda" className="mt-3 flex w-full items-center justify-center rounded-md bg-gold/10 py-2 text-xs font-bold text-navy transition-colors hover:bg-gold/20">
                                                Volver a Tienda
                                            </a>
                                        )}
                                        {checkoutMode && tx.paymentId && !contracts?.some(c=>c.membership_id===tx.membershipId) && !(memberships || []).some((m:any)=>m.id===tx.membershipId && m.plan?.is_active && (m.plan.full_payment_enabled || m.plan.monthly_payment_enabled) && !academyPayments.some(p=>p.ref_id===m.id && ['paid','refunded'].includes(p.status))) && ['pending', 'failed'].includes(tx.status) && (
                                            attempts?.some(a => a.payment_id === tx.paymentId && a.mode === checkoutMode && a.state === 'paid')
                                                ? <p className="mt-3 text-sm text-green-700">{checkoutMode === 'test' ? 'Prueba completada' : 'Pago confirmado'}</p>
                                                : <PayReceiptButton paymentId={tx.paymentId} test={checkoutMode === 'test'} />
                                        )}
                                        {!checkoutMode && !tx.isStore && ['pending', 'overdue', 'failed'].includes(tx.status) && (
                                            <div className="mt-3 flex w-full items-center justify-center rounded-md bg-amber-50 py-2 text-xs font-bold text-amber-700">
                                                Pendiente de gestión
                                            </div>
                                        )}
                                        {attempts?.filter(a=>a.payment_id===tx.paymentId && a.mode===checkoutMode && a.state==='open').map(a=><CancelCheckout key={a.id} kind="receipt" id={a.id} />)}
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
                        <a href="/portal/tienda" className="mt-6 rounded-xl bg-gold px-4 py-2 font-bold text-navy shadow-sm transition-colors hover:bg-gold-light">
                            Visitar Tienda Oficial
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
