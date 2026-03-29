'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
    Settings, Building2, CreditCard, Tag, FileText, Save, Plus,
    Trash2, Loader2, Lock, Euro, Clock, Edit
} from "lucide-react"
import {
    getSettings, updateSettings,
    getPlans, createPlan, updatePlan, deletePlan,
    getCategories, createCategory, deleteCategory,
    type MembershipPlan
} from "@/app/actions/settings"
import { toast } from "sonner"

export default function AjustesPage() {
    const [activeTab, setActiveTab] = useState('academia')
    const [settings, setSettings] = useState<Record<string, string>>({})
    const [plans, setPlans] = useState<MembershipPlan[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [planDialogOpen, setPlanDialogOpen] = useState(false)
    const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
    const [newCategory, setNewCategory] = useState('')

    useEffect(() => {
        async function load() {
            setLoading(true)
            const [s, p, c] = await Promise.all([getSettings(), getPlans(), getCategories()])
            setSettings(s)
            setPlans(p)
            setCategories(c)
            setLoading(false)
        }
        load()
    }, [])

    async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true)
        const fd = new FormData(e.currentTarget)
        const updates: Record<string, string> = {}
        for (const [key, value] of fd.entries()) {
            updates[key] = value as string
        }
        await updateSettings(updates)
        setSettings(prev => ({ ...prev, ...updates }))
        setSaving(false)
        toast.success("Ajustes guardados")
    }

    async function handleDeletePlan(id: string) {
        if (!confirm('¿Eliminar este plan?')) return
        const res = await deletePlan(id)
        if (res.success) {
            setPlans(prev => prev.filter(p => p.id !== id))
            toast.success("Plan eliminado")
        } else {
            toast.error(res.error)
        }
    }

    async function handleAddCategory() {
        if (!newCategory.trim()) return
        const res = await createCategory(newCategory.trim())
        if (res.success) {
            const cats = await getCategories()
            setCategories(cats)
            setNewCategory('')
            toast.success("Categoría creada")
        } else {
            toast.error(res.error)
        }
    }

    async function handleDeleteCategory(id: string) {
        if (!confirm('¿Eliminar esta categoría?')) return
        const res = await deleteCategory(id)
        if (res.success) {
            setCategories(prev => prev.filter(c => c.id !== id))
            toast.success("Categoría eliminada")
        } else {
            toast.error(res.error)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <Settings className="h-8 w-8 text-yellow-500" />
                    Ajustes
                </h1>
                <p className="text-muted-foreground font-medium text-sm">
                    Configuración general de la academia
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-white border shadow-sm p-1 h-auto">
                    <TabsTrigger value="academia" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        🏢 Academia
                    </TabsTrigger>
                    <TabsTrigger value="planes" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        📋 Planes
                    </TabsTrigger>
                    <TabsTrigger value="categorias" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        🏷️ Categorías
                    </TabsTrigger>
                    <TabsTrigger value="pagos" className="font-bold text-xs uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-2.5 rounded-lg">
                        💳 Pagos
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Academia Info */}
                <TabsContent value="academia">
                    <Card className="border-none shadow-lg">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="h-5 w-5 text-yellow-500" />
                                Datos de la Academia
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleSaveSettings} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Nombre</Label>
                                        <Input name="academy_name" defaultValue={settings.academy_name || ''} placeholder="Academy Costa Brava" className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">CIF / NIF</Label>
                                        <Input name="academy_cif" defaultValue={settings.academy_cif || ''} placeholder="B12345678" className="bg-white" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Teléfono</Label>
                                        <Input name="academy_phone" defaultValue={settings.academy_phone || ''} placeholder="972 123 456" className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Email</Label>
                                        <Input name="academy_email" type="email" defaultValue={settings.academy_email || ''} placeholder="info@academia.com" className="bg-white" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Dirección</Label>
                                    <Input name="academy_address" defaultValue={settings.academy_address || ''} placeholder="Calle Ejemplo 123, 17230 Palamós" className="bg-white" />
                                </div>
                                <div className="flex justify-end pt-4 border-t">
                                    <Button type="submit" disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8">
                                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Planes de Membresía */}
                <TabsContent value="planes">
                    <Card className="border-none shadow-lg">
                        <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5 text-yellow-500" />
                                Planes de Membresía
                            </CardTitle>
                            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={() => { setEditingPlan(null); setPlanDialogOpen(true) }}>
                                <Plus className="h-4 w-4 mr-2" /> Nuevo Plan
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            {plans.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <FileText className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-medium">No hay planes creados</p>
                                    <p className="text-sm">Crea tu primer plan de membresía</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {plans.map(plan => (
                                        <div key={plan.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-yellow-50 flex items-center justify-center">
                                                    <Euro className="h-5 w-5 text-yellow-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{plan.name}</p>
                                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {plan.frequency === 'mensual' ? 'Mensual' : plan.frequency === 'trimestral' ? 'Trimestral' : 'Anual'}
                                                        </span>
                                                        <span>{plan.duration_months} meses</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl font-black text-yellow-600">{plan.price || 0}€</span>
                                                <span className="text-xs text-slate-400">/{plan.frequency === 'mensual' ? 'mes' : plan.frequency === 'trimestral' ? 'trim.' : 'año'}</span>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPlan(plan); setPlanDialogOpen(true) }}>
                                                    <Edit className="h-3.5 w-3.5 text-slate-400" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeletePlan(plan.id)}>
                                                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Categorías */}
                <TabsContent value="categorias">
                    <Card className="border-none shadow-lg">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Tag className="h-5 w-5 text-yellow-500" />
                                Categorías de Alumnos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex gap-2 mb-6">
                                <Input
                                    placeholder="Nueva categoría..."
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
                                    className="bg-white"
                                />
                                <Button onClick={handleAddCategory} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shrink-0">
                                    <Plus className="h-4 w-4 mr-2" /> Añadir
                                </Button>
                            </div>
                            {categories.length === 0 ? (
                                <p className="text-center text-sm text-slate-400 py-8">No hay categorías</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                                            <span className="font-medium text-sm text-slate-700">{cat.name}</span>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Pagos / Stripe */}
                <TabsContent value="pagos">
                    <Card className="border-none shadow-lg">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CreditCard className="h-5 w-5 text-yellow-500" />
                                Configuración de Pagos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                                <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-800 text-sm">Stripe — Próximamente</p>
                                    <p className="text-xs text-amber-600 mt-1">
                                        La integración con Stripe está preparada. Cuando el socio confirme, solo habrá que introducir las claves API aquí y activar los cobros automáticos.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row items-center justify-between p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
                                    <div className="flex flex-col mb-4 md:mb-0">
                                        <h4 className="font-bold text-slate-800 text-base">Cuenta de Stripe</h4>
                                        <p className="text-sm text-slate-500">Conecta tu cuenta para recibir pagos automáticos por tarjeta.</p>
                                    </div>
                                    <Button type="button" variant="outline" className="border-indigo-200 text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 min-w-[200px]" disabled>
                                        <Lock className="w-4 h-4 mr-2" />
                                        Conectar Stripe
                                    </Button>
                                </div>
                                <div className="pt-4 border-t">
                                    <h3 className="font-bold text-sm text-slate-700 mb-3">Métodos de Pago Activos</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <span className="font-medium text-sm">Efectivo</span>
                                            </div>
                                            <Badge className="bg-green-100 text-green-700 border-none text-xs">Activo</Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <span className="font-medium text-sm">Transferencia Bancaria</span>
                                            </div>
                                            <Badge className="bg-green-100 text-green-700 border-none text-xs">Activo</Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-slate-300" />
                                                <span className="font-medium text-sm text-slate-400">Stripe (Tarjeta)</span>
                                            </div>
                                            <Badge className="bg-slate-100 text-slate-400 border-none text-xs">Pendiente</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Plan Dialog */}
            <PlanDialog
                open={planDialogOpen}
                onOpenChange={(o) => { setPlanDialogOpen(o); if (!o) setEditingPlan(null) }}
                plan={editingPlan}
                onSaved={async () => {
                    const p = await getPlans()
                    setPlans(p)
                }}
            />
        </div>
    )
}

// ─── PLAN DIALOG ───

function PlanDialog({ open, onOpenChange, plan, onSaved }: {
    open: boolean, onOpenChange: (o: boolean) => void, plan: MembershipPlan | null, onSaved: () => void
}) {
    const [loading, setLoading] = useState(false)
    const isEdit = !!plan

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        const data = {
            name: fd.get('name') as string,
            duration_months: parseInt(fd.get('duration_months') as string) || 1,
            price: parseFloat(fd.get('price') as string) || 0,
            frequency: fd.get('frequency') as string
        }

        const res = isEdit ? await updatePlan(plan.id, data) : await createPlan(data)
        setLoading(false)

        if (res.success) {
            toast.success(isEdit ? 'Plan actualizado' : 'Plan creado')
            onSaved()
            onOpenChange(false)
        } else {
            toast.error(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 border-0 overflow-hidden bg-slate-50 max-w-md sm:rounded-2xl shadow-2xl">
                <div className="bg-yellow-500 p-5 flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center mb-2">
                        <FileText className="h-6 w-6 text-black" />
                    </div>
                    <DialogTitle className="text-lg font-black text-black tracking-tight uppercase">
                        {isEdit ? 'Editar Plan' : 'Nuevo Plan'}
                    </DialogTitle>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Nombre del Plan</Label>
                        <Input name="name" defaultValue={plan?.name || ''} required placeholder="Ej. Cuota Mensual Benjamín" className="bg-white" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Precio (€)</Label>
                            <Input name="price" type="number" step="0.01" defaultValue={plan?.price || ''} required placeholder="45" className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Frecuencia</Label>
                            <select name="frequency" defaultValue={plan?.frequency || 'mensual'}
                                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                                <option value="mensual">Mensual</option>
                                <option value="trimestral">Trimestral</option>
                                <option value="anual">Anual</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Duración (meses)</Label>
                            <Input name="duration_months" type="number" defaultValue={plan?.duration_months || 12} min={1} className="bg-white" />
                        </div>
                    </div>
                    <div className="pt-3 flex justify-end gap-3 border-t">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-black hover:bg-slate-800 text-white font-bold px-6">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEdit ? 'Guardar' : 'Crear Plan'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
