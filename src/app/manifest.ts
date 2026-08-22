import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Academy Costa Brava',
        short_name: 'ACB Academy',
        description: 'Academia de fútbol, campus y portal para familias.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0c2241',
        theme_color: '#0c2241',
        lang: 'es',
        icons: [
            { src: '/icon.png', sizes: '512x512', type: 'image/png' },
            { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    }
}
