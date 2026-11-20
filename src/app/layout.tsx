import type { Metadata, Viewport } from 'next';
import { getLocale } from '@/lib/i18n/server';
import { LocaleProvider } from '@/lib/i18n/client';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from '@/app/providers';
import { PwaProvider } from '@/components/pwa/pwa-provider';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const baseMetadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'Academy Costa Brava',
    description: 'Gestión integral de academia de fútbol, campus y seguimiento de jugadores.',
    applicationName: 'Academy Costa Brava',
    appleWebApp: { capable: true, title: 'ACB Academy', statusBarStyle: 'default' },
    icons: {
        icon: [
            { url: '/icon.png', type: 'image/png', sizes: '512x512' },
            { url: '/favicon.ico', type: 'image/x-icon', sizes: '64x64' },
        ],
        apple: [{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }],
    },
    openGraph: {
        type: 'website',
        locale: 'es_ES',
        siteName: 'Academy Costa Brava',
        images: [{ url: '/landing-hero-new.png', alt: 'Academy Costa Brava' }],
    },
    twitter: { card: 'summary_large_image' },
};

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    return {
        ...baseMetadata,
        description: locale === 'ca' ? 'Gestió integral de l’acadèmia de futbol, campus i seguiment de jugadors.' : locale === 'en' ? 'Football academy, camps and player development management.' : baseMetadata.description,
        openGraph: { ...baseMetadata.openGraph, locale: locale === 'ca' ? 'ca_ES' : locale === 'en' ? 'en_GB' : 'es_ES' },
    };
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#102a4d',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    return (
        <html lang={locale}>
            <body className="font-sans antialiased">
                <LocaleProvider locale={locale}><Providers><PwaProvider>
                    {children}
                    <Toaster position="top-center" richColors />
                </PwaProvider></Providers></LocaleProvider>
            </body>
        </html>
    );
}
