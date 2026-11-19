import { getT } from '@/lib/i18n/server'
import WelcomeEnvelope from './welcome-envelope'
export async function generateMetadata() {
    const translate = await getT()
    return { title: translate('Tu bienvenida · Academy'), robots: { index: false, follow: false } }
}
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
    const params = await searchParams
    return <WelcomeEnvelope tournament={params.tipo === 'tournament'} />
}
