'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    AlertTriangle, Archive, BadgeCheck, Building2, CheckCircle2,
    Clock3, CreditCard, Database, Edit, Euro, ExternalLink, FileText,
    History, Landmark, Link2, Loader2, MapPin, Plus,
    ReceiptText, RefreshCw, Save, Settings, ShieldCheck, Tag, Trash2,
    WalletCards, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
    createCategory, createPlan, deleteCategory, deletePlan, getCategories,
    getPlans, getSettings, getSettingsOverview, setCategoryActive,
    setPlanActive, updateCategory, updatePlan, updateSettings,
    type AcademyCategory, type MembershipPlan, type SettingsOverview,
} from '@/app/actions/settings'

type SaveResult = { success: boolean; error?: string }

export default function AjustesPage() {
    const [settings, setSettings] = useState<Record<string, string>>({})
    const [plans, setPlans] = useState<MembershipPlan[]>([])
    const [categories, setCategories] = useState<AcademyCategory[]>([])
    const [overview, setOverview] = useState<SettingsOverview | null>(null)
    const [loading, setLoading] = useState(true)
    const [savingSection, setSavingSection] = useState<string | null>(null)
    const [planDialog, setPlanDialog] = useState<MembershipPlan | 'new' | null>(null)
    const [categoryDialog, setCategoryDialog] = useState<AcademyCategory | 'new' | null>(null)

    const loadAll = useCallback(async () => {
        setLoading(true)
        try {
            const [settingsData, plansData, categoriesData, overviewData] = await Promise.all([
                getSettings(), getPlans(true), getCategories(true), getSettingsOverview(),
            ])
            setSettings(settingsData)
            setPlans(plansData)
            setCategories(categoriesData)
            setOverview(overviewData)
        } catch (error) {
            console.error(error)
            toast.error('No se pudo cargar la configuración')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void loadAll() }, [loadAll])

    async function saveForm(section: string, event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSavingSection(section)
        const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>
        const result = await updateSettings(data)
        if (result.success) {
            toast.success('Configuración guardada')
            await loadAll()
        } else {
            toast.error(result.error || 'No se pudo guardar')
        }
        setSavingSection(null)
    }

    async function runAction(action: () => Promise<SaveResult>, successMessage: string) {
        const result = await action()
        if (!result.success) return toast.error(result.error || 'No se pudo completar la acción')
        toast.success(successMessage)
        await loadAll()
    }

    if (loading && !overview) {
        return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-yellow-500" /></div>
    }

    return (
        <div className="space-y-6 pb-12">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900">
                        <Settings className="h-8 w-8 text-yellow-500" /> Centro de Ajustes
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">Empresa, operativa, cobros, categorías e integraciones desde un único lugar.</p>
                </div>
                <Button variant="outline" onClick={() => void loadAll()} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar diagnóstico
                </Button>
                <Button asChild variant="outline"><Link href="/admin/ajustes/documento-base"><FileText className="mr-2 h-4 w-4" />Documento base</Link></Button>
            </header>

            <SettingsHealth overview={overview} />

            <Tabs defaultValue="empresa" className="space-y-5">
                <TabsList className="flex h-auto flex-wrap justify-start gap-1 border bg-white p-1 shadow-sm">
                    <Tab value="empresa" label="Empresa" icon={<Building2 className="h-4 w-4" />} />
                    <Tab value="operativa" label="Operativa" icon={<Clock3 className="h-4 w-4" />} />
                    <Tab value="planes" label="Planes" icon={<FileText className="h-4 w-4" />} />
                    <Tab value="categorias" label="Categorías" icon={<Tag className="h-4 w-4" />} />
                    <Tab value="cobros" label="Cobros" icon={<WalletCards className="h-4 w-4" />} />
                    <Tab value="integraciones" label="Sistema" icon={<ShieldCheck className="h-4 w-4" />} />
                </TabsList>

                <TabsContent value="empresa" className="space-y-5">
                    <form onSubmit={(event) => void saveForm('empresa', event)} className="space-y-5">
                        <SettingsCard title="Identidad empresarial y legal" description="Estos datos alimentan la web pública, contacto y páginas legales." icon={<Building2 className="h-5 w-5" />}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Nombre comercial" name="academy_name" value={settings.academy_name} required />
                                <Field label="Razón social / titular legal" name="academy_legal_name" value={settings.academy_legal_name} required />
                                <Field label="CIF / NIF" name="academy_cif" value={settings.academy_cif} required />
                                <Field label="Email general" name="academy_email" value={settings.academy_email} type="email" required />
                                <Field label="Teléfono" name="academy_phone" value={settings.academy_phone} required />
                                <Field label="WhatsApp público" name="academy_whatsapp" value={settings.academy_whatsapp} />
                                <div className="md:col-span-2"><Field label="Dirección fiscal y postal completa" name="academy_address" value={settings.academy_address} required /></div>
                                <Field label="Email de privacidad" name="privacy_contact_email" value={settings.privacy_contact_email} type="email" required />
                                <Field label="Sitio web" name="academy_website" value={settings.academy_website} type="url" />
                            </div>
                        </SettingsCard>

                        <SettingsCard title="Presencia pública" description="Enlaces y recursos usados por la cabecera, el pie y los canales públicos." icon={<Link2 className="h-5 w-5" />}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="URL del logotipo" name="academy_logo_url" value={settings.academy_logo_url} type="url" placeholder="https://..." />
                                <Field label="Portal público de resultados" name="tournaments_url" value={settings.tournaments_url} type="url" />
                                <Field label="Instagram" name="academy_instagram" value={settings.academy_instagram} type="url" />
                                <Field label="Facebook" name="academy_facebook" value={settings.academy_facebook} type="url" />
                                <Field label="YouTube" name="academy_youtube" value={settings.academy_youtube} type="url" />
                            </div>
                        </SettingsCard>
                        <SaveBar loading={savingSection === 'empresa'} />
                    </form>
                </TabsContent>

                <TabsContent value="operativa" className="space-y-5">
                    <form onSubmit={(event) => void saveForm('operativa', event)} className="space-y-5">
                        <SettingsCard title="Temporada y sede" description="Valores comunes para calendario, equipos y comunicación." icon={<MapPin className="h-5 w-5" />}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Temporada actual" name="current_season" value={settings.current_season} placeholder="2026/2027" required />
                                <Field label="Sede o instalación principal" name="default_location" value={settings.default_location} required />
                                <Field label="Inicio de temporada" name="season_start" value={settings.season_start} type="date" />
                                <Field label="Fin de temporada" name="season_end" value={settings.season_end} type="date" />
                                <div className="md:col-span-2"><Field label="Horario de atención" name="support_hours" value={settings.support_hours} placeholder="Lunes a viernes, 09:00–18:00" /></div>
                            </div>
                        </SettingsCard>
                        <SettingsCard title="Localización del sistema" description="Evita desfases de calendario e importes inconsistentes." icon={<Database className="h-5 w-5" />}>
                            <div className="grid gap-4 md:grid-cols-3">
                                <SelectField label="Zona horaria" name="timezone" value={settings.timezone || 'Europe/Madrid'} options={[['Europe/Madrid', 'Europe/Madrid']]} />
                                <SelectField label="Idioma" name="locale" value={settings.locale || 'es-ES'} options={[['es-ES', 'Español'], ['ca-ES', 'Català']]} />
                                <SelectField label="Moneda" name="currency" value={settings.currency || 'EUR'} options={[['EUR', 'EUR — Euro']]} />
                                <Field label="Conservación de datos (meses)" name="data_retention_months" value={settings.data_retention_months || '60'} type="number" min="12" max="120" />
                            </div>
                        </SettingsCard>
                        <SaveBar loading={savingSection === 'operativa'} />
                    </form>
                </TabsContent>

                <TabsContent value="planes">
                    <SettingsCard title="Planes de membresía" description="Los planes archivados dejan de aparecer en nuevas altas sin romper el histórico." icon={<Euro className="h-5 w-5" />}
                        action={<Button onClick={() => setPlanDialog('new')} className="bg-yellow-500 font-bold text-black hover:bg-yellow-600"><Plus className="mr-2 h-4 w-4" /> Nuevo plan</Button>}>
                        <div className="space-y-3">
                            {plans.map((plan) => (
                                <div key={plan.id} className={`flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${plan.is_active ? 'bg-white' : 'bg-slate-50 opacity-75'}`}>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-bold text-slate-900">{plan.name}</p>
                                            <Badge variant={plan.is_active ? 'default' : 'secondary'}>{plan.is_active ? 'Activo' : 'Archivado'}</Badge>
                                            {Boolean(plan.active_membership_count) && <Badge variant="outline">{plan.active_membership_count} altas activas</Badge>}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">{plan.description || 'Sin descripción'} · {plan.duration_months} meses · {frequencyLabel(plan.frequency)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="mr-3 text-right"><p className="text-xl font-black text-yellow-600">{money(plan.price)}</p>{plan.enrollment_fee > 0 && <p className="text-[10px] text-slate-400">+ {money(plan.enrollment_fee)} matrícula</p>}</div>
                                        <Button variant="outline" size="icon" aria-label={`Editar ${plan.name}`} onClick={() => setPlanDialog(plan)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="icon" aria-label={plan.is_active ? `Archivar ${plan.name}` : `Activar ${plan.name}`} onClick={() => void runAction(() => setPlanActive(plan.id, !plan.is_active), plan.is_active ? 'Plan archivado' : 'Plan activado')}><Archive className="h-4 w-4" /></Button>
                                        {!plan.membership_count && <Button variant="outline" size="icon" className="text-red-500" aria-label={`Eliminar ${plan.name}`} onClick={() => confirm(`¿Eliminar ${plan.name}?`) && void runAction(() => deletePlan(plan.id), 'Plan eliminado')}><Trash2 className="h-4 w-4" /></Button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SettingsCard>
                </TabsContent>

                <TabsContent value="categorias">
                    <SettingsCard title="Categorías deportivas" description="Define rangos por año de nacimiento. Una categoría en uso se archiva, nunca se rompe." icon={<Tag className="h-5 w-5" />}
                        action={<Button onClick={() => setCategoryDialog('new')} className="bg-yellow-500 font-bold text-black hover:bg-yellow-600"><Plus className="mr-2 h-4 w-4" /> Nueva categoría</Button>}>
                        <div className="grid gap-3 md:grid-cols-2">
                            {categories.map((category) => (
                                <div key={category.id} className={`rounded-xl border p-4 ${category.is_active ? 'bg-white' : 'bg-slate-50 opacity-75'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2"><p className="font-bold text-slate-900">{category.name}</p><Badge variant={category.is_active ? 'default' : 'secondary'}>{category.is_active ? 'Activa' : 'Archivada'}</Badge></div>
                                            <p className="mt-1 text-xs text-slate-500">{birthRange(category)} · {category.child_count} alumnos · {category.team_count} equipos</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" aria-label={`Editar ${category.name}`} onClick={() => setCategoryDialog(category)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" aria-label={category.is_active ? `Archivar ${category.name}` : `Activar ${category.name}`} onClick={() => void runAction(() => setCategoryActive(category.id, !category.is_active), category.is_active ? 'Categoría archivada' : 'Categoría activada')}><Archive className="h-4 w-4" /></Button>
                                            {category.child_count + category.team_count === 0 && <Button variant="ghost" size="icon" className="text-red-500" aria-label={`Eliminar ${category.name}`} onClick={() => confirm(`¿Eliminar ${category.name}?`) && void runAction(() => deleteCategory(category.id), 'Categoría eliminada')}><Trash2 className="h-4 w-4" /></Button>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SettingsCard>
                </TabsContent>

                <TabsContent value="cobros" className="space-y-5">
                    <SettingsCard title="Stripe de Academy" description="Los cobros se realizarán en la cuenta Stripe de Academy, vinculada a su propia cuenta bancaria." icon={<CreditCard className="h-5 w-5" />}>
                        <div className="space-y-5">
                            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
                                <Badge variant="outline">Pendiente de conexión</Badge>
                                <p className="mt-3 text-sm leading-relaxed text-slate-600">Crea la cuenta con los datos del negocio y completa la verificación y la cuenta bancaria en Stripe. Después, el equipo técnico conectará la web y comprobará los pagos antes de activar la tarjeta.</p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button asChild className="min-h-12 bg-gold font-bold text-navy hover:bg-gold/90"><a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">Crear cuenta Stripe <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
                                <Button asChild variant="outline" className="min-h-12"><a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">Abrir mi Stripe <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
                            </div>
                            <div className="border-t pt-4">
                                <p className="font-semibold text-navy">Gestiona tus precios desde Academy</p>
                                <p className="mt-1 text-sm text-slate-500">Los productos, fotos y precios se crean en Tienda; las cuotas en la pestaña Planes; y cada campus o torneo en su sección. Abrir Stripe no conecta automáticamente los pagos de la web.</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button asChild variant="outline"><Link href="/admin/tienda">Tienda y productos</Link></Button>
                                    <Button asChild variant="outline"><Link href="/admin/academia">Academia</Link></Button>
                                    <Button asChild variant="outline"><Link href="/admin/campus">Campus</Link></Button>
                                    <Button asChild variant="outline"><Link href="/admin/torneos">Torneos</Link></Button>
                                </div>
                            </div>
                        </div>
                    </SettingsCard>
                    <form onSubmit={(event) => void saveForm('cobros', event)} className="space-y-5">
                        <SettingsCard title="Métodos de pago" description="Solo los métodos activos aparecerán en nuevas inscripciones e ingresos." icon={<CreditCard className="h-5 w-5" />}>
                            <div className="grid gap-4 md:grid-cols-3">
                                <SelectField label="Efectivo" name="payment_cash_enabled" value={settings.payment_cash_enabled || 'true'} options={[['true', 'Activo'], ['false', 'Desactivado']]} />
                                <SelectField label="Transferencia" name="payment_transfer_enabled" value={settings.payment_transfer_enabled || 'true'} options={[['true', 'Activo'], ['false', 'Desactivado']]} />
                                <SelectField label="Tarjeta / Stripe" name="payment_card_enabled" value="false" options={[['false', 'No disponible hasta conectar Stripe']]} />
                                <SelectField label="Método predeterminado" name="default_payment_method" value={settings.default_payment_method || 'transferencia'} options={[['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['tarjeta', 'Tarjeta']]} />
                                <Field label="Día de vencimiento" name="billing_due_day" value={settings.billing_due_day || '5'} type="number" min="1" max="28" />
                                <Field label="Días de cortesía" name="billing_grace_days" value={settings.billing_grace_days || '5'} type="number" min="0" max="60" />
                            </div>
                            {settings.payment_card_enabled === 'true' && !overview?.stripeConfigured && <Warning text="La tarjeta está marcada como activa, pero Stripe todavía no dispone de una conexión operativa. Desactívala hasta completar la integración." />}
                        </SettingsCard>

                        <SettingsCard title="Transferencias y recibos" description="Datos internos para secretaría y numeración de documentos." icon={<Landmark className="h-5 w-5" />}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Titular de la cuenta" name="bank_account_holder" value={settings.bank_account_holder} />
                                <Field label="IBAN" name="bank_iban" value={settings.bank_iban} placeholder="ES00 0000 0000 0000 0000 0000" />
                                <Field label="BIC / SWIFT" name="bank_bic" value={settings.bank_bic} />
                                <Field label="Prefijo de recibos" name="receipt_prefix" value={settings.receipt_prefix || 'ACB'} />
                                <Field label="Impuesto / IVA (%)" name="invoice_tax_rate" value={settings.invoice_tax_rate || '0'} type="number" min="0" max="100" step="0.01" />
                                <div className="md:col-span-2"><TextField label="Instrucciones para transferencias" name="bank_transfer_instructions" value={settings.bank_transfer_instructions} /></div>
                                <div className="md:col-span-2"><TextField label="Notas predeterminadas en recibos" name="invoice_notes" value={settings.invoice_notes} /></div>
                            </div>
                        </SettingsCard>
                        <SaveBar loading={savingSection === 'cobros'} />
                    </form>
                </TabsContent>

                <TabsContent value="integraciones" className="space-y-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <IntegrationCard title="WhatsApp · Green API" configured={Boolean(overview?.whatsappConfigured)} description={overview?.whatsappConfigured ? 'Instancia configurada. Comprueba su autorización antes de los envíos.' : 'Sin credenciales. Los comunicados por WhatsApp no están disponibles.'} href="/admin/settings/whatsapp" />
                        <IntegrationCard title="Stripe" configured={Boolean(overview?.stripeConfigured)} description="La pasarela todavía no está conectada. No actives tarjeta hasta disponer de credenciales, webhooks y prueba real." />
                    </div>
                    <SettingsCard title="Historial de configuración" description="Últimos cambios en ajustes, planes y categorías." icon={<History className="h-5 w-5" />}>
                        {!overview?.audit.length ? <p className="py-8 text-center text-sm text-slate-400">El historial comenzará con el próximo cambio.</p> : (
                            <div className="divide-y rounded-xl border">
                                {overview.audit.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                                        <div><span className="font-semibold text-slate-800">{entityLabel(item.entity_type)}</span><span className="ml-2 text-slate-500">{item.entity_id}</span></div>
                                        <div className="text-right"><Badge variant="outline">{actionLabel(item.action)}</Badge><p className="mt-1 text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString('es-ES')}</p></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SettingsCard>
                </TabsContent>
            </Tabs>

            <PlanDialog open={planDialog !== null} plan={planDialog === 'new' ? null : planDialog} onClose={() => setPlanDialog(null)} onSaved={loadAll} />
            <CategoryDialog open={categoryDialog !== null} category={categoryDialog === 'new' ? null : categoryDialog} onClose={() => setCategoryDialog(null)} onSaved={loadAll} />
        </div>
    )
}

function SettingsHealth({ overview }: { overview: SettingsOverview | null }) {
    return (
        <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-xl">
            <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_2fr]">
                <div>
                    <div className="flex items-center justify-between"><p className="text-sm font-bold uppercase tracking-widest text-yellow-400">Preparación del negocio</p><span className="text-2xl font-black">{overview?.completion || 0}%</span></div>
                    <Progress value={overview?.completion || 0} className="mt-3" />
                    <p className="mt-3 text-xs text-slate-400">{overview?.missingRequired.length ? `Falta: ${overview.missingRequired.join(', ')}` : 'Configuración empresarial principal completa.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <HealthMetric label="Planes activos" value={overview?.activePlans || 0} ok={Boolean(overview?.activePlans)} />
                    <HealthMetric label="Categorías" value={overview?.activeCategories || 0} ok={Boolean(overview?.activeCategories)} />
                    <HealthMetric label="Alumnos sin categoría" value={overview?.uncategorizedChildren || 0} ok={!overview?.uncategorizedChildren} />
                    <HealthMetric label="Equipos sin categoría" value={overview?.uncategorizedTeams || 0} ok={!overview?.uncategorizedTeams} />
                </div>
            </CardContent>
        </Card>
    )
}

function HealthMetric({ label, value, ok }: { label: string; value: number; ok: boolean }) {
    return <div className="rounded-xl bg-white/5 p-3"><div className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}<span className="text-xl font-black">{value}</span></div><p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{label}</p></div>
}

function Tab({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
    return <TabsTrigger value={value} className="gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wide data-[state=active]:bg-slate-900 data-[state=active]:text-white">{icon}{label}</TabsTrigger>
}

function SettingsCard({ title, description, icon, action, children }: { title: string; description: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
    return <Card className="border-slate-200 shadow-sm"><CardHeader className="flex flex-col gap-3 border-b bg-slate-50/60 md:flex-row md:items-center md:justify-between"><div><CardTitle className="flex items-center gap-2 text-lg">{icon}{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div>{action}</CardHeader><CardContent className="p-5 md:p-6">{children}</CardContent></Card>
}

function Field({ label, name, value = '', required, ...props }: { label: string; name: string; value?: string; required?: boolean } & Omit<React.ComponentProps<typeof Input>, 'name' | 'defaultValue'>) {
    return <div className="space-y-2"><Label htmlFor={name} className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}{required && ' *'}</Label><Input id={name} name={name} defaultValue={value} required={required} className="bg-white" {...props} /></div>
}

function TextField({ label, name, value = '' }: { label: string; name: string; value?: string }) {
    return <div className="space-y-2"><Label htmlFor={name} className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</Label><Textarea id={name} name={name} defaultValue={value} rows={3} className="bg-white" /></div>
}

function SelectField({ label, name, value, options }: { label: string; name: string; value: string; options: Array<[string, string]> }) {
    return <div className="space-y-2"><Label htmlFor={name} className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</Label><select id={name} name={name} defaultValue={value} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></div>
}

function SaveBar({ loading }: { loading: boolean }) {
    return <div className="sticky bottom-4 z-10 flex justify-end"><Button type="submit" disabled={loading} className="bg-yellow-500 px-8 font-bold text-black shadow-lg hover:bg-yellow-600">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar sección</Button></div>
}

function Warning({ text }: { text: string }) {
    return <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="h-5 w-5 shrink-0" /><p>{text}</p></div>
}

function IntegrationCard({ title, configured, description, href }: { title: string; configured: boolean; description: string; href?: string }) {
    return <Card><CardContent className="flex h-full flex-col justify-between gap-5 p-6"><div><div className="flex items-center justify-between"><div className={`rounded-xl p-3 ${configured ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{configured ? <BadgeCheck className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}</div><Badge variant={configured ? 'default' : 'secondary'}>{configured ? 'Configurado' : 'Pendiente'}</Badge></div><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-sm text-slate-500">{description}</p></div>{href && <Button asChild variant="outline"><a href={href}>Gestionar integración <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}</CardContent></Card>
}

function PlanDialog({ open, plan, onClose, onSaved }: { open: boolean; plan: MembershipPlan | null; onClose: () => void; onSaved: () => Promise<void> }) {
    const [saving, setSaving] = useState(false)
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setSaving(true)
        const fd = new FormData(event.currentTarget)
        const payload = {
            name: String(fd.get('name') || ''), description: String(fd.get('description') || ''),
            price: Number(fd.get('price')), enrollment_fee: Number(fd.get('enrollment_fee')),
            frequency: String(fd.get('frequency')) as MembershipPlan['frequency'],
            duration_months: Number(fd.get('duration_months')), sort_order: Number(fd.get('sort_order')),
            is_active: fd.get('is_active') === 'true',
        }
        const result = plan ? await updatePlan(plan.id, payload) : await createPlan(payload)
        setSaving(false)
        if (!result.success) return toast.error(result.error)
        toast.success(plan ? 'Plan actualizado' : 'Plan creado'); await onSaved(); onClose()
    }
    return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-w-lg p-0"><div className="bg-yellow-500 p-5 text-center"><ReceiptText className="mx-auto h-7 w-7" /><DialogTitle className="mt-2 font-black uppercase">{plan ? 'Editar plan' : 'Nuevo plan'}</DialogTitle></div><form onSubmit={submit} className="space-y-4 p-5"><Field label="Nombre" name="name" value={plan?.name} required /><TextField label="Descripción" name="description" value={plan?.description} /><div className="grid grid-cols-2 gap-3"><Field label="Precio por periodo" name="price" value={String(plan?.price ?? '')} type="number" min="0" step="0.01" required /><Field label="Matrícula" name="enrollment_fee" value={String(plan?.enrollment_fee ?? 0)} type="number" min="0" step="0.01" /></div><div className="grid grid-cols-2 gap-3"><SelectField label="Frecuencia" name="frequency" value={plan?.frequency || 'mensual'} options={[['mensual', 'Mensual'], ['trimestral', 'Trimestral'], ['anual', 'Anual']]} /><Field label="Duración (meses)" name="duration_months" value={String(plan?.duration_months ?? 1)} type="number" min="1" max="60" /></div><div className="grid grid-cols-2 gap-3"><SelectField label="Estado" name="is_active" value={String(plan?.is_active ?? true)} options={[['true', 'Activo'], ['false', 'Archivado']]} /><Field label="Orden" name="sort_order" value={String(plan?.sort_order ?? 0)} type="number" min="0" max="999" /></div><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-yellow-500 font-bold text-black hover:bg-yellow-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button></div></form></DialogContent></Dialog>
}

function CategoryDialog({ open, category, onClose, onSaved }: { open: boolean; category: AcademyCategory | null; onClose: () => void; onSaved: () => Promise<void> }) {
    const [saving, setSaving] = useState(false)
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setSaving(true)
        const fd = new FormData(event.currentTarget)
        const from = String(fd.get('birth_year_from') || '')
        const to = String(fd.get('birth_year_to') || '')
        const payload = { name: String(fd.get('name') || ''), short_name: String(fd.get('short_name') || ''), birth_year_from: from ? Number(from) : null, birth_year_to: to ? Number(to) : null, sort_order: Number(fd.get('sort_order')), is_active: fd.get('is_active') === 'true' }
        const result = category ? await updateCategory(category.id, payload) : await createCategory(payload)
        setSaving(false)
        if (!result.success) return toast.error(result.error)
        toast.success(category ? 'Categoría actualizada' : 'Categoría creada'); await onSaved(); onClose()
    }
    return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-w-lg p-0"><div className="bg-yellow-500 p-5 text-center"><Tag className="mx-auto h-7 w-7" /><DialogTitle className="mt-2 font-black uppercase">{category ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle></div><form onSubmit={submit} className="space-y-4 p-5"><div className="grid grid-cols-2 gap-3"><Field label="Nombre" name="name" value={category?.name} required /><Field label="Nombre corto" name="short_name" value={category?.short_name || ''} /></div><div className="grid grid-cols-2 gap-3"><Field label="Año nacimiento desde" name="birth_year_from" value={String(category?.birth_year_from ?? '')} type="number" min="1990" max="2100" /><Field label="Año nacimiento hasta" name="birth_year_to" value={String(category?.birth_year_to ?? '')} type="number" min="1990" max="2100" /></div><div className="grid grid-cols-2 gap-3"><SelectField label="Estado" name="is_active" value={String(category?.is_active ?? true)} options={[['true', 'Activa'], ['false', 'Archivada']]} /><Field label="Orden" name="sort_order" value={String(category?.sort_order ?? 0)} type="number" min="0" max="999" /></div><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-yellow-500 font-bold text-black hover:bg-yellow-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button></div></form></DialogContent></Dialog>
}

function frequencyLabel(value: MembershipPlan['frequency']) { return value === 'mensual' ? 'Mensual' : value === 'trimestral' ? 'Trimestral' : 'Anual' }
function money(value: number) { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value) }
function birthRange(category: AcademyCategory) { return category.birth_year_from && category.birth_year_to ? `${category.birth_year_from}–${category.birth_year_to}` : 'Sin rango de edad' }
function entityLabel(value: SettingsOverview['audit'][number]['entity_type']) { return value === 'setting' ? 'Ajuste' : value === 'plan' ? 'Plan' : 'Categoría' }
function actionLabel(value: SettingsOverview['audit'][number]['action']) { return value === 'create' ? 'Creado' : value === 'update' ? 'Modificado' : 'Eliminado' }
