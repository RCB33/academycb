import WelcomeEnvelope from './welcome-envelope'
export const metadata = { title: 'Tu bienvenida · Academy', robots: { index: false, follow: false } }
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
    const params = await searchParams
    return <WelcomeEnvelope tournament={params.tipo === 'tournament'} />
}
