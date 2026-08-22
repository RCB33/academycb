import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from '@/app/providers';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'Academy Costa Brava',
    description: 'Gestión integral de academia de fútbol, campus y seguimiento de jugadores.',
    applicationName: 'Academy Costa Brava',
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

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className="font-sans antialiased">
                <Providers>
                    {children}
                    <Toaster position="top-center" richColors />
                </Providers>
            </body>
        </html>
    );
}
