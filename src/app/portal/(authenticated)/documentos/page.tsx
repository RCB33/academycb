import { redirect } from 'next/navigation'
import { Archive, Calendar, Camera, CheckCircle, FileText, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageConsentManager } from '@/components/portal/image-consent-manager'
import { PortalPageHeader } from '@/components/portal/portal-page-header'

const IMAGE_DOCUMENT = 'Autorización de imagen y vídeo'

export default async function DocumentosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/portal')

    const { data: guardian } = await supabase.from('guardians').select('id').eq('user_id', user.id).maybeSingle()
    const [{ data: links }, { data: signatures }] = guardian ? await Promise.all([
        supabase.from('child_guardians').select('child:children(id, full_name)').eq('guardian_id', guardian.id),
        supabase.from('signatures').select('*, child:children(full_name)').eq('guardian_id', guardian.id).order('signed_at', { ascending: false }),
    ]) : [{ data: [] }, { data: [] }]

    const players = (links || [])
        .map((link: any) => link.child)
        .filter(Boolean)
        .map((child: any) => ({
            id: child.id,
            fullName: child.full_name,
            consent: (signatures || []).find((signature: any) => signature.child_id === child.id && signature.document_type === IMAGE_DOCUMENT) || null,
        }))

    const documents = await Promise.all((signatures || []).map(async (signature: any) => {
        if (!signature.signature_image_path) return { ...signature, signedUrl: null }
        const { data } = await supabase.storage.from('signatures').createSignedUrl(signature.signature_image_path, 600)
        return { ...signature, signedUrl: data?.signedUrl || null }
    }))

    return <div className="space-y-8">
        <PortalPageHeader icon={<ShieldCheck className="h-6 w-6" />} title="Documentos y autorizaciones" description="Decide, firma y consulta toda la documentación de tus jugadores desde un único lugar." />

        <section className="space-y-4" aria-labelledby="family-decisions-title">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-navy"><Camera className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Decisiones de la familia</p><h2 id="family-decisions-title" className="font-heading text-2xl font-black uppercase text-navy">Autorizaciones</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">Gestiona por separado el uso privado y público de fotografías y vídeos. La decisión es opcional, puede retirarse y cada cambio queda registrado con fecha, versión y firma.</p></div>
            </div>
            {guardian && players.length > 0 ? <ImageConsentManager guardianId={guardian.id} players={players} /> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">No hay jugadores vinculados a esta cuenta.</div>}
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-8" aria-labelledby="signed-documents-title">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-gold"><Archive className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Archivo familiar</p><h2 id="signed-documents-title" className="font-heading text-2xl font-black uppercase text-navy">Firmados y descargables</h2><p className="mt-1 text-sm text-slate-500">Historial de consentimientos y documentos firmados por el tutor legal.</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {documents.length > 0 ? documents.map((doc: any) => <Card key={doc.id} className="relative overflow-hidden border-l-4 border-l-green-500 bg-white shadow-sm transition-all hover:shadow-md">
                    <div className="pointer-events-none absolute right-[-20px] top-[-20px] text-green-500/10"><CheckCircle size={120} strokeWidth={1} /></div>
                    <CardHeader className="border-b bg-slate-50/50 pb-2"><CardTitle className="flex items-center justify-between text-lg text-slate-800"><span className="truncate">{doc.document_type}</span><CheckCircle className="h-5 w-5 shrink-0 rounded-full bg-white text-green-500 shadow-sm" /></CardTitle></CardHeader>
                    <CardContent className="relative z-10 flex flex-col gap-3 pt-4">
                        <div className="flex items-center text-sm font-medium text-slate-600"><span className="mr-3 rounded-md bg-slate-100 p-1.5"><Calendar className="h-4 w-4 text-slate-500" /></span>{new Date(doc.signed_at).toLocaleDateString('es-ES')} a las {new Date(doc.signed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="ml-10 text-xs text-slate-500">Versión: <span className="rounded bg-slate-100 px-1 font-mono">{doc.document_version}</span></div>
                        {doc.child?.full_name && <div className="ml-10 text-xs text-slate-500">Jugador: <span className="font-semibold text-slate-700">{doc.child.full_name}</span></div>}
                        {doc.document_type === IMAGE_DOCUMENT && <div className="ml-10 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Uso interno: <strong>{doc.consent_options?.portal_internal ? 'autorizado' : 'no autorizado'}</strong> · Uso público: <strong>{doc.consent_options?.public_communications ? 'autorizado' : 'no autorizado'}</strong></div>}
                        {doc.signedUrl && <div className="mt-1 border-t border-slate-100 pt-3"><a href={doc.signedUrl} target="_blank" rel="noreferrer" className="flex items-center text-sm font-bold text-gold transition-colors hover:text-navy hover:underline"><FileText className="mr-1.5 h-4 w-4" />Ver firma registrada</a></div>}
                    </CardContent>
                </Card>) : <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-14 text-center shadow-sm"><div className="mb-4 rounded-full bg-slate-50 p-4"><FileText className="h-8 w-8 text-slate-400" /></div><h3 className="text-lg font-bold text-slate-700">Todavía no hay documentos firmados</h3><p className="mt-1 max-w-sm text-sm text-slate-500">Cuando registres una autorización o la academia añada documentación, aparecerá aquí.</p></div>}
            </div>
        </section>
    </div>
}
