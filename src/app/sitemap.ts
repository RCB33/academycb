import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const routes = ['', '/academia', '/campus', '/torneos', '/tienda', '/contacto', '/aviso-legal', '/privacidad', '/cookies', '/terminos']
    return routes.map((route) => ({
        url: `${baseUrl}${route}`,
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority: route === '' ? 1 : route.startsWith('/aviso') || route === '/privacidad' || route === '/cookies' || route === '/terminos' ? 0.3 : 0.7,
    }))
}
