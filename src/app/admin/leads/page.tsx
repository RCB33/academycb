'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Phone, MessageSquare, Clock, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        fetchLeads()
    }, [])

    async function fetchLeads() {
        const { data } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setLeads(data)
    }

    async function updateStatus(id: string, newStatus: string) {
        const { error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) toast.error("Error al actualizar")
        else {
            toast.success("Estado actualizado")
            fetchLeads()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Leads & Contacto</h1>
                <Button variant="outline" onClick={() => fetchLeads()}>Refrescar</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {leads.map((lead) => (
                    <Card key={lead.id} className={`border-l-4 ${lead.status === 'new' ? 'border-l-blue-500' :
                        lead.status === 'contacted' ? 'border-l-yellow-500' :
                            lead.status === 'enrolled' ? 'border-l-green-500' :
                                'border-l-gray-300'
                        }`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <Badge variant={lead.status === 'new' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                                    {lead.status === 'new' ? 'Nuevo' : lead.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(lead.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <CardTitle className="text-lg">{lead.child_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">Tutor: {lead.guardian_name}</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="font-semibold">Año: <span className="font-normal">{lead.birth_year}</span></div>
                                <div className="font-semibold">Cat: <span className="font-normal">{lead.category_text}</span></div>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Phone className="w-4 h-4 text-green-600" />
                                <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Mail className="w-4 h-4 text-blue-600" />
                                <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email || 'Sin email'}</a>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateStatus(lead.id, 'contacted')}>Contactado</Button>
                                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateStatus(lead.id, 'enrolled')}>Inscrito</Button>
                                <Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => updateStatus(lead.id, 'lost')}>Descartar</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {leads.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No hay leads pendientes.</p>}
            </div>
        </div>
    )
}
