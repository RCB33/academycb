'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Phone, Clock, Mail, ClipboardCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner'
import { convertLead, updateLeadStatus } from '@/app/actions/leads'
import { convertEnrollmentRequest, updateEnrollmentRequestStatus } from '@/app/actions/enrollment'

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<any[]>([])
    const [contacts, setContacts] = useState<any[]>([])
    const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([])
    const [canConvert, setCanConvert] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchLeads()
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
            setCanConvert(profile?.role === 'admin')
        })
    }, [])

    async function fetchLeads() {
        const [leadResult, contactResult, enrollmentResult] = await Promise.all([
            supabase.from('leads').select('*').order('created_at', { ascending: false }),
            supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
            supabase.from('enrollment_requests').select('*').order('created_at', { ascending: false })
        ])
        if (leadResult.data) setLeads(leadResult.data)
        if (contactResult.data) setContacts(contactResult.data)
        if (enrollmentResult.data) setEnrollmentRequests(enrollmentResult.data)
    }

    async function updateStatus(id: string, newStatus: string) {
        const result = await updateLeadStatus(id, newStatus)
        if (!result.success) toast.error(result.error || "Error al actualizar")
        else {
            toast.success("Estado actualizado")
            fetchLeads()
        }
    }

    async function handleConvert(id: string) {
        toast.loading("Convirtiendo lead...")
        const result = await convertLead(id)
        toast.dismiss()
        if (result.success) {
            toast.success("Lead convertido a Alumno con éxito")
            fetchLeads()
        } else {
            toast.error("Error al convertir: " + result.error)
        }
    }

    async function updateEnrollmentStatus(id: string, status: string) {
        const result = await updateEnrollmentRequestStatus(id, status)
        if (!result.success) toast.error(result.error || 'Error al actualizar la solicitud')
        else {
            toast.success('Solicitud actualizada')
            fetchLeads()
        }
    }

    async function handleEnrollmentConversion(id: string) {
        toast.loading('Creando ficha del jugador…')
        const result = await convertEnrollmentRequest(id)
        toast.dismiss()
        if (!result.success) toast.error(result.error || 'No se pudo crear la ficha')
        else {
            toast.success('Ficha de alumno y tutor creada')
            fetchLeads()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Solicitudes web</h1>
                <Button variant="outline" onClick={() => fetchLeads()}>Refrescar</Button>
            </div>

            <section className="space-y-4">
                <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-gold" /><h2 className="text-xl font-bold">Solicitudes de inscripción</h2></div>
                <p className="text-sm text-muted-foreground">Solicitudes estructuradas de Academia, Campus o Torneos. La plaza no está confirmada hasta que secretaría la revise.</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {enrollmentRequests.map((request) => (
                        <Card key={request.id} className={`border-l-4 ${request.status === 'new' ? 'border-l-blue-500' : request.status === 'contacted' ? 'border-l-yellow-500' : request.status === 'enrolled' ? 'border-l-green-500' : 'border-l-slate-300'}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between gap-3"><Badge variant={request.status === 'new' ? 'default' : 'secondary'} className="uppercase text-[10px]">{request.status === 'new' ? 'Nueva' : request.status}</Badge><span className="text-xs text-muted-foreground flex items-center"><Clock className="mr-1 h-3 w-3" />{new Date(request.created_at).toLocaleDateString('es-ES')}</span></div>
                                <CardTitle className="text-lg">{request.child_name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{serviceLabel(request.service)} · {request.activity_name}</p>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <p><span className="font-semibold">Nacimiento:</span> {new Date(`${request.birth_date}T00:00:00`).toLocaleDateString('es-ES')}</p>
                                <p><span className="font-semibold">Tutor:</span> {request.guardian_name}</p>
                                <a href={`mailto:${request.email}`} className="flex items-center gap-2 font-medium hover:underline"><Mail className="h-4 w-4 text-blue-600" />{request.email}</a>
                                <a href={`tel:${request.phone}`} className="flex items-center gap-2 font-medium hover:underline"><Phone className="h-4 w-4 text-green-600" />{request.phone}</a>
                                {request.notes && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-600">{request.notes}</p>}
                                <div className="flex flex-wrap gap-2 border-t pt-4"><Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateEnrollmentStatus(request.id, 'contacted')}>Contactado</Button><Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateEnrollmentStatus(request.id, 'interested')}>En trámite</Button>{canConvert && request.status !== 'enrolled' && <Button size="sm" className="flex-1 bg-gold text-xs font-bold text-navy hover:bg-gold/80" onClick={() => handleEnrollmentConversion(request.id)}>Aceptar y crear ficha</Button>}<Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => updateEnrollmentStatus(request.id, 'lost')}>Descartar</Button></div>
                            </CardContent>
                        </Card>
                    ))}
                    {enrollmentRequests.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">No hay solicitudes de inscripción pendientes.</p>}
                </div>
            </section>

            <section className="space-y-4 border-t pt-6">
                <h2 className="text-xl font-bold">Solicitudes de información</h2>
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
                                {canConvert && <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleConvert(lead.id)}>Inscrito</Button>}
                                <Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => updateStatus(lead.id, 'lost')}>Descartar</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {leads.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No hay leads pendientes.</p>}
                </div>
            </section>

            <div className="space-y-4 pt-6 border-t">
                <h2 className="text-xl font-bold">Consultas generales</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {contacts.map((contact) => (
                        <Card key={contact.id} className="border-l-4 border-l-indigo-500">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between gap-3">
                                    <Badge variant="secondary">Consulta</Badge>
                                    <span className="text-xs text-muted-foreground">{new Date(contact.created_at).toLocaleDateString()}</span>
                                </div>
                                <CardTitle className="text-lg">{contact.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:underline"><Mail className="h-4 w-4" />{contact.email}</a>
                                {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:underline"><Phone className="h-4 w-4" />{contact.phone}</a>}
                                <p className="whitespace-pre-wrap text-slate-600">{contact.message}</p>
                            </CardContent>
                        </Card>
                    ))}
                    {contacts.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No hay consultas generales.</p>}
                </div>
            </div>
        </div>
    )
}

function serviceLabel(service: string) {
    if (service === 'academy') return 'Academia'
    if (service === 'campus') return 'Campus'
    if (service === 'tournament') return 'Torneo'
    return service
}
