import type { Metadata } from 'next'
import { EmailCodeForm } from './email-code-form'

export const metadata: Metadata = { title: 'Acceso con código', robots: { index: false, follow: false } }

export default async function EmailCodePage({ searchParams }: { searchParams: Promise<{ type?: string; next?: string }> }) {
    const query = await searchParams
    return <EmailCodeForm initialType={query.type === 'invite' ? 'invite' : 'recovery'} next={query.next} />
}
