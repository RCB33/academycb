import Link from 'next/link'
import { CircleHelp, Mail, Phone } from 'lucide-react'
import { getT } from '@/lib/i18n/server'
import { PortalPageHeader } from '@/components/portal/portal-page-header'

export default async function FamilyHelpPage() {
    const t = await getT()
    return <div className="mx-auto max-w-3xl space-y-6">
        <PortalPageHeader icon={<CircleHelp className="h-6 w-6" />} title={t('Ayuda y contacto')} description={t('Estamos aquí para ayudarte con tus jugadores, inscripciones y pagos.')} />
        <div className="grid gap-4 sm:grid-cols-2">
            <a href="tel:+34654139429" className="rounded-2xl border bg-white p-6 text-navy hover:border-gold"><Phone className="mb-3 h-6 w-6" /><h2 className="font-bold">{t('Llamar a Academy')}</h2><p className="mt-2">654 139 429</p></a>
            <a href="mailto:costabravaacademy@gmail.com" className="rounded-2xl border bg-white p-6 text-navy hover:border-gold"><Mail className="mb-3 h-6 w-6" /><h2 className="font-bold">{t('Escribir a Academy')}</h2><p className="mt-2 break-all">costabravaacademy@gmail.com</p></a>
        </div>
        <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">{t('¿Qué necesitas consultar?')}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[
            ['/portal/pagos', 'Pagos y recibos'], ['/portal/torneos', 'Mis torneos'], ['/portal/documentos', 'Documentos y autorizaciones'], ['/portal/profile', 'Mi perfil'],
        ].map(([href, label]) => <Link key={href} href={href} className="rounded-xl bg-slate-50 p-4 font-semibold text-navy hover:bg-gold/10">{t(label)} →</Link>)}</div></section>
    </div>
}
