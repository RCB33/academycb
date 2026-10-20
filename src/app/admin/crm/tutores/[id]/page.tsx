import { getGuardianById } from '@/app/actions/guardians'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, Users, Calendar, ArrowLeft } from "lucide-react"
import { GuardianNotesEditor } from './notes-editor'
import { TutorProfileActions } from './tutor-profile-actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AccessActivationStatus } from '@/components/admin/access-activation-status'
import { requireAdmin } from '@/lib/auth'
import { getPlans } from '@/app/actions/settings'
import { FamilyPlanAssignment } from '@/components/admin/family-plan-assignment'
import { FamilyPlanSummary, type FamilyMembership, type FamilyPayment } from '@/components/family-plan-summary'

export default async function TutorProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    const guardian = await getGuardianById(resolvedParams.id)

    if (!guardian) {
        notFound()
    }
    const { supabase } = await requireAdmin()
    const children = (guardian.children || []).map((row: { child: { id: string; full_name: string } }) => row.child).filter(Boolean)
    const ids = children.map((child: {id: string}) => child.id)
    const [plans, teamsResult, membershipsResult, paymentsResult] = await Promise.all([
        getPlans(),
        supabase.from('teams').select('id,name').eq('status','active').order('name'),
        ids.length ? supabase.from('academy_memberships').select('*,plan:membership_plans(name,frequency)').in('child_id',ids).order('start_date',{ascending:false}) : Promise.resolve({data:[],error:null}),
        ids.length ? supabase.from('payments').select('*,manual_receipt_allocations(amount,paid_date,method,voided_at)').in('child_id',ids) : Promise.resolve({data:[],error:null}),
    ])
    if (teamsResult.error || membershipsResult.error || paymentsResult.error) throw new Error('No se pudo cargar la información de planes y pagos')

    return (
        <div className="space-y-6">
            {/* Context Nav */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/crm/tutores">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Directorio
                    </Link>
                </Button>
            </div>

            {/* Profile Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 p-8 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex items-start gap-6">
                    <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-bold shadow-inner">
                        {guardian.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">{guardian.full_name}</h1>
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                Rol: Tutor
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
                            <div className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" /> {guardian.email || 'Sin email'}</div>
                            <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> {guardian.phone || 'Sin teléfono'}</div>
                            <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" /> Alta: {new Date(guardian.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>

                <TutorProfileActions guardian={guardian} />
            </div>

            {/* Content Tabs / Info Grid */}
            <div className="grid md:grid-cols-3 gap-6">

                {/* Left Column: Children */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="shadow-sm border-slate-100">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
                                <Users className="h-5 w-5 text-indigo-500" />
                                Alumnos Vinculados
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {guardian.children && guardian.children.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {guardian.children.map((childGuardian: any) => (
                                        <div key={childGuardian.child.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                                    {childGuardian.child.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">{childGuardian.child.full_name}</h3>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500 border-slate-200">
                                                            {childGuardian.child.category?.name || 'Academia'}
                                                        </Badge>
                                                        <span>Año: {childGuardian.child.birth_year}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2">
                                            <FamilyPlanAssignment childId={childGuardian.child.id} childName={childGuardian.child.full_name} plans={plans} teams={teamsResult.data||[]} />
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/crm/alumnos/${childGuardian.child.id}`}>
                                                    Ver Perfil Alumno
                                                </Link>
                                            </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">
                                    <p>Este tutor no tiene alumnos vinculados actualmente.</p>
                                    <p className="text-sm mt-1">Busca al alumno en el <Link href="/admin/crm/alumnos" className="text-indigo-600 underline">CRM General</Link> para vincularlo.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <FamilyPlanSummary students={children} memberships={membershipsResult.data as unknown as FamilyMembership[]} payments={paymentsResult.data as unknown as FamilyPayment[]} />
                </div>

                {/* Right Column: Meta & Notes */}
                <div className="space-y-6">
                    <Card className="border-slate-100 shadow-sm">
                        <CardHeader className="border-b border-slate-100 pb-3">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-navy">Acceso al portal</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <AccessActivationStatus status={guardian.access_activation} />
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-100 bg-amber-50/30">
                        <CardHeader className="pb-3 border-b border-amber-100/50">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-amber-700">Notas Internas</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 text-sm text-amber-900 leading-relaxed">
                            <GuardianNotesEditor guardianId={guardian.id} currentNotes={guardian.notes} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
