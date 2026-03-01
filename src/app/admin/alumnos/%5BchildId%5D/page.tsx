'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from 'sonner'
import { Save, Activity, CalendarDays, User as UserIcon } from "lucide-react"

export default function AdminChildDetailPage({ params }: { params: { childId: string } }) {
    const [child, setChild] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('profile')
    const supabase = createClient()

    // Forms State
    const [metrics, setMetrics] = useState({
        pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50, discipline: 50,
        notes: ''
    })
    const [note, setNote] = useState({ title: '', content: '' })

    // Categories for dropdown
    const [categories, setCategories] = useState<any[]>([])

    useEffect(() => {
        fetchChild()
        fetchCategories()
    }, [])

    async function fetchChild() {
        const { data } = await supabase.from('children').select('*, category:categories(*)').eq('id', params.childId).single()
        if (data) setChild(data)
        setLoading(false)
    }

    async function fetchCategories() {
        const { data } = await supabase.from('categories').select('*').order('name')
        if (data) setCategories(data)
    }

    async function handleUpdateProfile() {
        const { error } = await supabase.from('children').update({
            full_name: child.full_name,
            birth_year: child.birth_year,
            category_id: child.category_id,
            notes: child.notes
        }).eq('id', child.id)

        if (error) toast.error("Error al actualizar perfil")
        else toast.success("Perfil actualizado")
    }

    async function handleSaveMetrics() {
        const { error } = await supabase.from('child_metrics').insert([{
            child_id: child.id,
            recorded_at: new Date().toISOString(),
            ...metrics
        }])

        if (error) toast.error("Error al guardar métricas")
        else {
            toast.success("Métricas registradas")
            // Reset form or redirect
        }
    }

    async function handleSaveNote() {
        const { error } = await supabase.from('coach_notes').insert([{
            child_id: child.id,
            note_date: new Date().toISOString(),
            title: note.title,
            content: note.content,
            visibility: 'guardian_visible'
        }])
        if (error) toast.error("Error al guardar nota")
        else {
            toast.success("Nota añadida")
            setNote({ title: '', content: '' })
        }
    }

    if (loading || !child) return <div className="p-8">Cargando...</div>

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 border-b pb-4">
                <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{child.full_name}</h1>
                    <p className="text-sm text-muted-foreground">ID: {child.id}</p>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex space-x-2 border-b">
                <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>Perfil</TabButton>
                <TabButton active={activeTab === 'fifa'} onClick={() => setActiveTab('fifa')}>Métricas FIFA</TabButton>
                <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>Notas y Seguimiento</TabButton>
            </div>

            {activeTab === 'profile' && (
                <Card>
                    <CardHeader><CardTitle>Datos del Jugador</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre Completo</Label>
                                <Input value={child.full_name} onChange={e => setChild({ ...child, full_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Año Nacimiento</Label>
                                <Input type="number" value={child.birth_year} onChange={e => setChild({ ...child, birth_year: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Categoría Interna</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={child.category_id || ''}
                                    onChange={e => setChild({ ...child, category_id: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notas Internas</Label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={child.notes || ''}
                                onChange={e => setChild({ ...child, notes: e.target.value })}
                            />
                        </div>
                        <Button onClick={handleUpdateProfile}><Save className="mr-2 h-4 w-4" /> Guardar Cambios</Button>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'fifa' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Evaluación Técnica (FIFA Card)</CardTitle>
                        <CardDescription>Puntúa del 0 al 99. Esto actualizará el gráfico histórico.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <StatInput label="Ritmo (PAC)" value={metrics.pace} onChange={(v: number) => setMetrics({ ...metrics, pace: v })} />
                            <StatInput label="Tiro (SHO)" value={metrics.shooting} onChange={(v: number) => setMetrics({ ...metrics, shooting: v })} />
                            <StatInput label="Pase (PAS)" value={metrics.passing} onChange={(v: number) => setMetrics({ ...metrics, passing: v })} />
                            <StatInput label="Regate (DRI)" value={metrics.dribbling} onChange={(v: number) => setMetrics({ ...metrics, dribbling: v })} />
                            <StatInput label="Defensa (DEF)" value={metrics.defending} onChange={(v: number) => setMetrics({ ...metrics, defending: v })} />
                            <StatInput label="Físico (PHY)" value={metrics.physical} onChange={(v: number) => setMetrics({ ...metrics, physical: v })} />
                            <StatInput label="Disciplina" value={metrics.discipline} onChange={(v: number) => setMetrics({ ...metrics, discipline: v })} />
                        </div>
                        <Button onClick={handleSaveMetrics} className="w-full"><Activity className="mr-2 h-4 w-4" /> Registrar Evaluación Hoy</Button>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'notes' && (
                <Card>
                    <CardHeader><CardTitle>Comunicación y Feedback</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Input placeholder="Título de la nota (ej: Partido fin de semana)" value={note.title} onChange={e => setNote({ ...note, title: e.target.value })} />
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Contenido para el tutor..."
                                value={note.content}
                                onChange={e => setNote({ ...note, content: e.target.value })}
                            />
                            <Button onClick={handleSaveNote}><CalendarDays className="mr-2 h-4 w-4" /> Publicar Nota</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function TabButton({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
            {children}
        </button>
    )
}

function StatInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <label>{label}</label>
                <span className="font-bold">{value}</span>
            </div>
            <input
                type="range"
                min="0" max="99"
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
            />
        </div>
    )
}
