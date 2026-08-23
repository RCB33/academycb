import { redirect } from 'next/navigation'
import { Camera, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ImageConsentManager } from '@/components/portal/image-consent-manager'

const IMAGE_DOCUMENT = 'Autorización de imagen y vídeo'

export default async function AuthorizationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/portal')

    const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
    if (!guardian) redirect('/portal/dashboard')

    const [{ data: links }, { data: signatures }] = await Promise.all([
        supabase.from('child_guardians').select('child:children(id, full_name)').eq('guardian_id', guardian.id),
        supabase.from('signatures')
            .select('child_id, consent_options, signed_at, document_version')
            .eq('guardian_id', guardian.id)
            .eq('document_type', IMAGE_DOCUMENT)
            .order('signed_at', { ascending: false }),
    ])

    const children = (links || [])
        .map((link: any) => link.child)
        .filter(Boolean)
        .map((child: any) => ({
            id: child.id,
            fullName: child.full_name,
            consent: (signatures || []).find((signature: any) => signature.child_id === child.id) || null,
        }))

    return <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl bg-navy px-6 py-8 text-white shadow-xl md:px-9">
            <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold"><ShieldCheck className="h-4 w-4" />Decisiones de la familia</div>
                <h1 className="font-heading text-3xl font-black uppercase md:text-4xl">Autorizaciones de imagen</h1>
                <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">Decide de forma independiente cómo puede usar la academia las fotografías y vídeos de cada jugador. No afecta a su plaza ni a su participación deportiva.</p>
            </div>
        </section>

        <section className="rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm leading-relaxed text-slate-700">
            <div className="flex gap-3"><Camera className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><div><h2 className="font-bold text-navy">Tú tienes el control</h2><p className="mt-1">Las opciones parten desactivadas. Puedes autorizar el uso interno, el público, ambos o ninguno. Cada cambio se firma y queda guardado en <strong>Documentos</strong>; también puedes volver a retirarlo cuando quieras.</p></div></div>
        </section>

        {children.length > 0 ? <ImageConsentManager guardianId={guardian.id} players={children} /> : <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">No hay jugadores vinculados a esta cuenta.</section>}
    </div>
}
