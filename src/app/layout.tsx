import type { Metadata } from 'next';
import { Inter, Rajdhani, Figtree } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const rajdhani = Rajdhani({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-rajdhani'
});
const figtree = Figtree({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-figtree'
});

export const metadata: Metadata = {
    title: 'Academia de Fútbol | Portal Familias',
    description: 'Gestión integral de academia de fútbol, campus y seguimiento de jugadores.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={`${inter.variable} ${rajdhani.variable} ${figtree.variable} font-sans antialiased`}>
                {children}
                <Toaster position="top-center" richColors />
            </body>
        </html>
    );
}
