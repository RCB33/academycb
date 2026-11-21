'use client'

import { useState } from 'react'
import { Archive, ArchiveRestore, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { setContactArchived } from '@/app/actions/contact-messages'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export type ContactMessage = { id: string; name: string; email: string; phone: string | null; message: string; status: string; created_at: string }

export function ContactMessageInbox({ contacts, canManage, loadError, onStatusChanged }: {
    contacts: ContactMessage[]
    canManage: boolean
    loadError: boolean
    onStatusChanged: (id: string, status: 'closed' | 'new') => void
}) {
    const [archived, setArchived] = useState(false)
    const [selected, setSelected] = useState<ContactMessage | null>(null)
    const [busy, setBusy] = useState<string | null>(null)
    const archivedCount = contacts.filter(contact => contact.status === 'closed').length
    const visible = contacts.filter(contact => (contact.status === 'closed') === archived)

    async function changeStatus(contact: ContactMessage, archive: boolean) {
        if (busy) return
        setBusy(contact.id)
        try {
            const result = await setContactArchived(contact.id, archive)
            if (!result.success) { toast.error(result.error); return }
            onStatusChanged(result.id, result.status)
            setSelected(null)
            toast.success(archive ? 'Consulta archivada. Puedes recuperarla en Archivadas.' : 'Consulta restaurada en Activas.')
        } catch {
            toast.error('No se pudo actualizar la consulta. Comprueba tu sesión e inténtalo de nuevo.')
        } finally { setBusy(null) }
    }

    return <section id="consultas-generales" className="space-y-4 border-t pt-6" aria-labelledby="contact-inbox-heading">
        <div>
            <h2 id="contact-inbox-heading" className="text-xl font-bold">Consultas generales</h2>
            <p className="mt-2 text-sm text-muted-foreground">Archiva las consultas antiguas o la publicidad para retirarlas de la lista activa. Puedes recuperarlas en Archivadas.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mostrar consultas">
            <Button type="button" variant={archived ? 'outline' : 'default'} aria-pressed={!archived} onClick={() => setArchived(false)}>Activas ({contacts.length - archivedCount})</Button>
            <Button type="button" variant={archived ? 'default' : 'outline'} aria-pressed={archived} onClick={() => setArchived(true)}><Archive className="mr-2 h-4 w-4" />Archivadas ({archivedCount})</Button>
        </div>
        {loadError ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No se pudieron cargar las consultas. Pulsa Refrescar para intentarlo de nuevo.</p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map(contact => <Card key={contact.id} className={`min-w-0 border-l-4 ${archived ? 'border-l-slate-300' : 'border-l-indigo-500'}`}>
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap justify-between gap-2"><Badge variant="secondary">{archived ? 'Archivada' : 'Consulta'}</Badge><span className="text-xs text-muted-foreground">{new Date(contact.created_at).toLocaleDateString('es-ES')}</span></div>
                    <CardTitle className="break-words text-lg">{contact.name}</CardTitle>
                    {canManage && <Button type="button" variant="outline" disabled={busy !== null} className="mt-2 min-h-11 w-full" onClick={() => archived ? void changeStatus(contact, false) : setSelected(contact)}>
                        {archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                        {busy === contact.id ? 'Guardando…' : archived ? 'Restaurar consulta' : 'Archivar consulta'}
                    </Button>}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:underline"><Mail className="h-4 w-4 shrink-0" /><span className="min-w-0 break-all">{contact.email}</span></a>
                    {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:underline"><Phone className="h-4 w-4 shrink-0" /><span className="min-w-0 break-all">{contact.phone}</span></a>}
                    <p className="whitespace-pre-wrap break-words text-slate-600">{contact.message}</p>
                </CardContent>
            </Card>)}
            {visible.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">{archived ? 'No hay consultas archivadas.' : 'No hay consultas activas.'}</p>}
        </div>}
        <AlertDialog open={selected !== null} onOpenChange={open => { if (!open && !busy) setSelected(null) }}>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-xl sm:max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Archivar esta consulta?</AlertDialogTitle>
                    <AlertDialogDescription>La consulta de {selected?.name} se retirará de Activas. Podrás recuperarla en Archivadas. Las inscripciones, los jugadores y los pagos se mantienen igual.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy !== null}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction disabled={busy !== null} onClick={event => { event.preventDefault(); if (selected) void changeStatus(selected, true) }}>{busy ? 'Archivando…' : 'Archivar consulta'}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </section>
}
