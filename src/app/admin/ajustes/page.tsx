'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import { toast } from 'sonner'

export default function AdminSettingsPage() {
    const [categories, setCategories] = useState<any[]>([])
    const [newCat, setNewCat] = useState('')
    const supabase = createClient()

    useEffect(() => {
        fetchCategories()
    }, [])

    async function fetchCategories() {
        const { data } = await supabase.from('categories').select('*').order('name')
        if (data) setCategories(data)
    }

    async function addCategory() {
        if (!newCat) return
        const { error } = await supabase.from('categories').insert([{ name: newCat }])
        if (error) toast.error("Error al crear")
        else {
            toast.success("Categoría creada")
            setNewCat('')
            fetchCategories()
        }
    }

    async function deleteCategory(id: string) {
        if (!confirm("¿Seguro? Se borrará la categoría.")) return
        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (error) toast.error("Error al borrar (puede estar en uso)")
        else {
            toast.success("Borrada")
            fetchCategories()
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Categorías Internas</CardTitle>
                    <CardDescription>Define los grupos de edad o nivel para organizar a los alumnos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input placeholder="Nueva Categoría (ej: Prebenjamín)" value={newCat} onChange={e => setNewCat(e.target.value)} />
                        <Button onClick={addCategory}><Plus className="mr-2 h-4 w-4" /> Añadir</Button>
                    </div>

                    <div className="grid gap-2">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                <span className="font-medium">{cat.name}</span>
                                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteCategory(cat.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
