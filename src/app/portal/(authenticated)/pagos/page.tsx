import { getPortalViewer } from '@/lib/admin-view'

import { MonthlyCardOption, monthlyCardRequests } from '@/components/portal/monthly-card-option'
import { StartMonthlyCard } from '@/components/portal/start-monthly-card'
import { monthlyCardCandidates } from '@/lib/parent-monthly-card'
import { getLocale, getT } from '@/lib/i18n/server'
import { redirect } from 'next/navigation'
import { PaymentsOverview } from '@/components/portal/payments-overview'
import type { FamilyReceipt, FamilyPlan, FamilyBilling, FamilyContract } from '@/lib/family-payments-overview'
import { stripeCheckoutMode, stripeSalesConfigured } from '@/lib/stripe-availability'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConfirmationRefresh } from '@/app/admin/stripe/confirmation-refresh'
import { CancelCheckout } from './cancel-checkout'
import Link from 'next/link'
import { billingLabels, billingSummary, type BillingRequest } from '@/lib/billing-request'

export default async function PagosPage({ searchParams }: { searchParams: Promise<{ attempt?: string; contract?: string; cancelled?: string }> }) {
    const translate = await getT()

    const params = await searchParams
    const { supabase, user, view } = await getPortalViewer()

    if (!user) redirect('/portal')
    // Independent reads run together; ownership filters and payment calculations
    // are unchanged. Nothing here writes receipts or contacts Stripe.
    let billingQuery = supabase.from('billing_requests').select('*,billing_request_items(*),billing_request_attempts(state,billing_status,schedule_id,subscription_id)')
    if (view) billingQuery = billingQuery.eq('guardian_id',view.selectedId)
    const [checkoutMode, billingResult, attemptsResult, guardiansResult, ordersResult] = await Promise.all([
        stripeCheckoutMode(),
        billingQuery.in('state',['ready','processing','active','cancelling']).order('created_at',{ascending:false}),
        supabase.from('receipt_checkout_attempts').select('id,payment_id,state,mode').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('guardians').select('id, child_guardians(child_id)').eq('user_id', user.id),
        user.email_confirmed_at && user.email ? createAdminClient().from('orders').select('*, order_items (*)').eq('customer_email', user.email.trim().toLowerCase()) : Promise.resolve({ data: [], error:null }),
    ])
    const paymentMode = checkoutMode || stripeSalesConfigured()
    const { data: billingRequests, error: billingError } = billingResult
    if (billingError) throw new Error('No se pudieron cargar las solicitudes de cobro')
    const { data: attempts } = attemptsResult
    if(guardiansResult.error || attemptsResult.error || ordersResult.error) throw new Error('No se pudieron cargar los datos de pagos')
    const { data: guardians } = guardiansResult
    const { data: orders } = ordersResult
    const childIds = [...new Set(guardians?.flatMap(g => g.child_guardians?.map((cg: { child_id: string }) => cg.child_id) || []) || [])]
    const orderIds = (orders || []).map(o => o.id)

    // Children only come from this guardian; shop receipts only from orders
    // matched to the verified Auth email. Do not replace these with global reads.
    const [contractsResult, familyChildren, familyMemberships, paymentsResult, orderReceiptsResult] = await Promise.all([
        supabase.from('academy_checkout_contracts').select('id,membership_id,state,mode,choice,months,unit_cents,fee_cents,total_cents,billing_status,stripe_schedule_id,stripe_subscription_id,academy_contract_collections(id,amount_cents)').eq('owner_id',user.id).eq('mode',paymentMode || 'live').not('state','in','(expired,cancelled)'),
        childIds.length ? supabase.from('children').select('id,full_name,archived_at').in('id',childIds) : Promise.resolve({ data: [], error: null }),
        childIds.length ? supabase.from('academy_memberships').select('*,plan:membership_plans(name,frequency)').in('child_id',childIds).order('start_date',{ascending:false}) : Promise.resolve({ data: [], error: null }),
        childIds.length ? supabase.from('payments').select('*, manual_receipt_allocations(amount,paid_date,method,voided_at)').in('child_id', childIds) : Promise.resolve({ data: [], error: null }),
        orderIds.length ? createAdminClient().from('payments').select('*,manual_receipt_allocations(amount,paid_date,method,voided_at)').eq('type', 'shop').in('ref_id', orderIds) : Promise.resolve({ data: [], error:null }),
    ])
    const { data: contracts, error: contractsError } = contractsResult
    if (contractsError) throw new Error('No se pudo consultar el estado del pago con tarjeta')
    if (familyChildren.error || familyMemberships.error) throw new Error('No se pudieron cargar los planes de la familia')
    if (paymentsResult.error) throw new Error('No se pudieron cargar los pagos')
    const academyPayments = paymentsResult.data || []
    if(orderReceiptsResult.error) throw new Error('No se pudieron cargar los recibos de tienda')
    const { data: orderReceipts } = orderReceiptsResult
    const returnedAttempt = attempts?.find(a => a.id === params.attempt)
    const returnedContract = contracts?.find(c => c.id === params.contract)
    const monthlyEnabled = Boolean(checkoutMode && (checkoutMode === 'test' || process.env.STRIPE_RECURRING_PAYMENTS_ENABLED === 'true'))
    const monthlyRequestIds = new Set(monthlyCardRequests((billingRequests || []) as BillingRequest[], paymentMode).map(request => request.id))
    const otherBillingRequests = (billingRequests || []).filter(request => !monthlyRequestIds.has(request.id))
    const locale = await getLocale()
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
    const candidates = monthlyCardCandidates(familyMemberships.data || [], academyPayments, (billingRequests || []) as BillingRequest[], contracts || [], paymentMode || 'live', today, now)
        .filter(m => familyChildren.data?.some(c => c.id === m.child_id && !c.archived_at))
    const eligibleGuardians = (guardians || []).filter(g => g.child_guardians?.some((cg: { child_id: string }) => candidates.some(m => m.child_id === cg.child_id)))

    // Keep only display fields in the client payload. Never send provider sessions or URLs.
    const merged=new Map([...academyPayments,...(orderReceipts||[])].map(p=>[p.id,p]))
    const receipts:FamilyReceipt[]=[...merged.values()].map(p=>({id:p.id,child_id:p.child_id,ref_id:p.ref_id,type:p.type,description:p.description,amount:Number(p.amount),status:p.status,due_date:p.due_date,paid_at:p.paid_at,method:p.method,covered_month:p.covered_month,manual_receipt_allocations:p.manual_receipt_allocations||[],downloadable:true,hasInvoice:Boolean(p.stripe_invoice_id)}))
    const plans=(familyMemberships.data||[]).map(m=>({id:m.id,child_id:m.child_id,status:m.status,start_date:m.start_date,end_date:m.end_date,monthly_price:m.monthly_price,agreed_payment_method:m.agreed_payment_method,plan_snapshot:{name:m.plan_snapshot?.name,frequency:m.plan_snapshot?.frequency},plan:m.plan})) as unknown as FamilyPlan[]
    const notices=<>
        {returnedAttempt?.state==='paid'&&<p role="status" className="rounded-xl bg-green-50 p-4 text-sm">{translate(returnedAttempt.mode==='test'?'Prueba confirmada correctamente. Tu recibo real sigue sin cambios.':'Pago confirmado. El recibo se ha actualizado correctamente.')}</p>}
        {returnedAttempt&&<ConfirmationRefresh pending={['creating','open'].includes(returnedAttempt.state)&&!params.cancelled}/>}
        {params.cancelled&&<p role="status" className="rounded-xl border p-4 text-sm">{translate('Has vuelto sin finalizar el pago. No se ha marcado como abonado por regresar a esta página.')}</p>}
        {returnedContract&&<><p role="status" className="rounded-xl border p-4 text-sm">{translate(returnedContract.state==='completed'?'Contrato pagado por completo.':returnedContract.state==='active'?'Mensualidades activadas. Los cobros terminarán automáticamente al finalizar el periodo contratado.':'Estamos confirmando tu contrato con Stripe.')}</p><ConfirmationRefresh pending={['creating','open'].includes(returnedContract.state)&&!params.cancelled}/></>}
    </>
    const management=<div className="space-y-4">
        <MonthlyCardOption requests={(billingRequests||[]) as BillingRequest[]} mode={paymentMode} enabled={monthlyEnabled} now={now} locale={locale} viewOnly={Boolean(view)} legacyInProgress={Boolean(contracts?.some(c=>c.choice==='monthly'&&['creating','open','active'].includes(c.state)))} selfService={eligibleGuardians.length?<div className="space-y-3">{eligibleGuardians.map(g=><StartMonthlyCard key={g.id} guardianId={g.id} enabled={monthlyEnabled} locale={locale}/>)}</div>:undefined}/>
        {otherBillingRequests.map(r=><article key={r.id} className="space-y-2 rounded-xl border p-4"><h3 className="font-semibold">{r.title}</h3><p className="text-sm">{billingSummary(r as BillingRequest)}</p><p className="text-sm">{billingLabels[r.state]||r.state}</p><Link className="inline-flex min-h-11 items-center font-semibold underline" href={'/portal/pagos/solicitud/'+r.id}>{translate('Revisar solicitud')}</Link></article>)}
        {contracts?.map(c=><article key={c.id} className="space-y-2 rounded-xl border p-4"><h3 className="font-semibold">{plans.find(m=>m.id===c.membership_id)?.plan_snapshot?.name||'Academy'}</h3><p className="text-sm">{billingLabels[c.state]||c.state}{c.mode==='test'?' · TEST':''}</p>{c.billing_status==='attention'&&<p role="alert" className="text-sm text-amber-800">{translate('Hay una cuota pendiente o una autorización bancaria por completar. Contacta con Academy para revisar el pago. No contrates otro plan.')}</p>}{c.state==='open'&&<CancelCheckout kind="academy" id={c.id}/>}</article>)}
        {attempts?.filter(a=>a.mode===paymentMode&&a.state==='open').map(a=><CancelCheckout key={a.id} kind="receipt" id={a.id}/>)}
        {orders?.some(o=>!orderReceipts?.some(p=>p.ref_id===o.id))&&<Link href="/portal/tienda" className="block text-sm underline">{translate('Consultar pedidos de tienda sin recibo asociado')}</Link>}
    </div>
    return <PaymentsOverview students={familyChildren.data||[]} plans={plans} receipts={receipts} requests={(billingRequests||[]) as FamilyBilling[]} contracts={(contracts||[]) as FamilyContract[]} today={today} mode={paymentMode||'live'} management={management} notices={notices}/>
}
