import { getT } from '@/lib/i18n/server'
import { LanguageSwitcher } from '@/lib/i18n/client'
import { Settings } from 'lucide-react'
import { PortalPageHeader } from '@/components/portal/portal-page-header'

export default async function SettingsPage() {
    const translate = await getT()
    return <div className="mx-auto max-w-4xl space-y-6">
        <PortalPageHeader icon={<Settings className="h-6 w-6" />} title={translate('Preferencias')} description={translate('Elige el idioma de la web y del portal. Se conservará al navegar.')} />
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold text-navy">{translate('Idioma')}</h2>
            <LanguageSwitcher />
        </section>
    </div>
}
