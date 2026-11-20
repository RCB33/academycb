import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Academy Costa Brava',
        short_name: 'ACB Academy',
        description: 'Academia de fútbol, campus y portal para familias.',
        id: '/',
        start_url: '/portal',
        scope: '/',
        display: 'standalone',
        background_color: '#102a4d',
        theme_color: '#102a4d',
        lang: 'es',
        categories: ['sports', 'education'],
        prefer_related_applications: false,
        icons: [
            { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    }
}
