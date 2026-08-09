import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import HeaderCart from "./components/header-cart"
import CartDrawer from "./components/cart-drawer"
import type { Metadata } from "next"
import { getPublicSettings } from "@/lib/public-settings"

export const metadata: Metadata = {
    title: {
        template: '%s | Academy Costa Brava',
        default: 'Academy Costa Brava — Academia de Fútbol',
    },
    description: 'Academia de fútbol en la Costa Brava. Campus, torneos, tienda oficial y portal para familias.',
}

const navigation = [
    ['Academia', '/academia'],
    ['Campus', '/campus'],
    ['Torneos', '/torneos'],
    ['Tienda', '/tienda'],
    ['Contacto', '/contacto'],
] as const

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const settings = await getPublicSettings()
    const academyName = settings.academy_name || 'Academy Costa Brava'
    const academyLogo = settings.academy_logo_url || '/logo.jpg'
    const socialLinks = [
        ['Instagram', settings.academy_instagram],
        ['Facebook', settings.academy_facebook],
        ['YouTube', settings.academy_youtube],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]))
    const year = new Date().getFullYear()

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-navy/80 backdrop-blur supports-[backdrop-filter]:bg-navy/70">
                    <div className="container flex h-16 items-center justify-between">
                        <Link href="/" className="flex items-center space-x-3 font-bold text-xl tracking-tight">
                            <div className="relative h-12 w-12">
                                {/* The logo is configurable by the business and may use its own CDN. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={academyLogo}
                                    alt={`${academyName} Logo`}
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 object-contain"
                                />
                            </div>
                            <span className="hidden xs:inline font-heading text-white uppercase">{academyName}</span>
                        </Link>

                        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-white">
                            {navigation.map(([label, href]) => <Link key={href} href={href} className="transition-colors hover:text-gold">{label}</Link>)}
                        </nav>

                        <div className="flex items-center space-x-2 md:space-x-4">
                            <HeaderCart />
                            <Link href="/portal">
                                <Button variant="outline" size="sm" className="hidden sm:flex border-white bg-white text-navy hover:bg-gray-100 hover:text-navy font-heading font-bold uppercase tracking-wide">
                                    Acceso Familias
                                </Button>
                            </Link>
                            <Link href="/inscripcion" className="hidden md:block">
                                <Button size="sm" className="bg-gold text-white hover:bg-gold-light hover:text-white">Inscribirse</Button>
                            </Link>
                            <details className="relative md:hidden">
                                <summary aria-label="Abrir menú" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-white/20 text-white [&::-webkit-details-marker]:hidden">
                                    <Menu className="h-5 w-5" />
                                </summary>
                                <nav className="absolute right-0 top-12 w-56 rounded-xl border border-white/10 bg-navy p-3 shadow-2xl">
                                    {navigation.map(([label, href]) => <Link key={href} href={href} className="block rounded-lg px-4 py-3 text-sm font-medium text-white hover:bg-white/10 hover:text-gold">{label}</Link>)}
                                    <Link href="/inscripcion" className="mt-2 block rounded-lg bg-gold px-4 py-3 text-center text-sm font-bold text-navy">Inscribirse</Link>
                                    <Link href="/portal" className="mt-2 block rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-bold text-white">Acceso familias</Link>
                                </nav>
                            </details>
                        </div>
                    </div>
                </header>
                <main className="flex-1">
                    {children}
                </main>
                <footer className="border-t border-white/10 bg-navy py-12 text-gray-300">
                    <div className="container grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                        <div>
                            <p className="font-heading text-xl font-bold uppercase text-white">{academyName}</p>
                            {settings.academy_address && <p className="mt-2 text-sm">{settings.academy_address}</p>}
                            {socialLinks.length > 0 && <div className="mt-3 flex flex-wrap gap-4 text-sm">{socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="hover:text-gold">{label}</a>)}</div>}
                            <p className="mt-4 text-xs text-gray-500">© {year} {academyName}. Todos los derechos reservados.</p>
                        </div>
                        <nav aria-label="Información legal" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
                            <Link href="/aviso-legal" className="hover:text-gold">Aviso legal</Link>
                            <Link href="/privacidad" className="hover:text-gold">Privacidad</Link>
                            <Link href="/cookies" className="hover:text-gold">Cookies</Link>
                            <Link href="/terminos" className="hover:text-gold">Condiciones</Link>
                        </nav>
                    </div>
                </footer>
                <CartDrawer />
            </div>
    )
}
