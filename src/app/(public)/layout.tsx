
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import Link from "next/link"
import { LanguageSwitcher } from "@/lib/i18n/client"
import { Button } from "@/components/ui/button"
import { Instagram } from "lucide-react"
import MobileNavigation from "./components/mobile-navigation"
import HeaderCart from "./components/header-cart"
import CartDrawer from "./components/cart-drawer"
import { getPublicSettings } from "@/lib/public-settings"

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({
    title: {
        template: '%s | Academy Costa Brava',
        default: 'Academy Costa Brava — Academia de Fútbol',
    },
    description: 'Academia de fútbol en la Costa Brava. Campus, torneos, tienda oficial y portal para familias.',
}, translate)
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
    const translate = await getT()

    const settings = await getPublicSettings()
    const academyName = settings.academy_name || 'Academy Costa Brava'
    const academyLogo = settings.academy_logo_url || '/logo.jpg'
    const socialLinks = [
        ['Instagram', 'https://www.instagram.com/academy.costabrava?cnvx=MWpzaWJvZjVuanlnZw=='],
        ['Facebook', settings.academy_facebook],
        ['YouTube', settings.academy_youtube],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]))
    const year = new Date().getFullYear()

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-navy shadow-lg shadow-navy/20">
                    <div className="container flex h-16 gap-1 items-center justify-between px-2 sm:gap-2 sm:px-8">
                        <Link href="/" className="flex items-center space-x-3 font-bold text-xl tracking-tight">
                            <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                                {/* The logo is configurable by the business and may use its own CDN. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={academyLogo}
                                    alt={translate(`${academyName} Logo`)}
                                    width={48}
                                    height={48}
                                    className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                                />
                            </div>
                            <span className="hidden xs:inline font-heading text-white uppercase">{translate(academyName)}</span>
                        </Link>

                        <nav className="hidden xl:flex items-center space-x-5 text-sm font-medium text-white">
                            {translate(navigation.map(([label, href]) => <Link key={href} href={href} className="transition-colors hover:text-gold">{translate(label)}</Link>))}
                        </nav>

                        <div className="flex items-center gap-1 sm:gap-2 xl:gap-3">
                            <a href="https://www.instagram.com/academy.costabrava?cnvx=MWpzaWJvZjVuanlnZw==" target="_blank" rel="noopener noreferrer" aria-label={translate("Instagram de Academy Costa Brava (se abre en otra pestaña)")} title="@academy.costabrava" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold transition hover:border-gold hover:bg-gold hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
                                <Instagram className="h-5 w-5" aria-hidden="true" />
                            </a>
                            <LanguageSwitcher />
                            <HeaderCart />
                            <Link href="/portal">
                                <Button variant="outline" size="sm" className="hidden sm:flex border-white bg-white text-navy hover:bg-gray-100 hover:text-navy font-heading font-bold uppercase tracking-wide">
                                    {translate("Acceso Familias")}</Button>
                            </Link>
                            <Link href="/inscripcion" className="hidden xl:block">
                                <Button size="sm" className="bg-gold text-white hover:bg-gold-light hover:text-white">{translate("Inscribirse")}</Button>
                            </Link>
                            <MobileNavigation>
                                <nav className="absolute right-0 top-12 w-56 rounded-xl border border-white/10 bg-navy p-3 shadow-2xl">
                                    {translate(navigation.map(([label, href]) => <Link key={href} href={href} className="block rounded-lg px-4 py-3 text-sm font-medium text-white hover:bg-white/10 hover:text-gold">{translate(label)}</Link>))}
                                    <Link href="/inscripcion" className="mt-2 block rounded-lg bg-gold px-4 py-3 text-center text-sm font-bold text-navy">{translate("Inscribirse")}</Link>
                                    <Link href="/portal" className="mt-2 block rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-bold text-white">{translate("Acceso familias")}</Link>
                                </nav>
                            </MobileNavigation>
                        </div>
                    </div>
                </header>
                <main className="flex-1">
                    {translate(children)}
                </main>
                <footer className="border-t border-white/10 bg-navy py-12 text-gray-300">
                    <div className="container grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                        <div>
                            <p className="font-heading text-xl font-bold uppercase text-white">{translate(academyName)}</p>
                            {translate(settings.academy_address && <p className="mt-2 text-sm">{translate(settings.academy_address)}</p>)}
                            {socialLinks.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                                {socialLinks.map(([label, href]) => <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label === 'Instagram' ? translate("Instagram de Academy Costa Brava (se abre en otra pestaña)") : undefined}
                                    className={label === 'Instagram'
                                        ? "inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-gold px-5 py-3 font-bold text-navy shadow-lg shadow-gold/15 transition-colors hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                                        : "hover:text-gold"}
                                >
                                    {label === 'Instagram' && <Instagram className="h-5 w-5 shrink-0" aria-hidden="true" />}
                                    {translate(label)}
                                </a>)}
                            </div>}
                            {settings.prices_include_vat === 'true' && <p className="mt-4 text-sm">{translate("Todos los precios incluyen IVA.")}</p>}
                            <p className="mt-4 text-xs text-gray-500">{translate("© ")}{translate(year)} {translate(academyName)}{translate(". Todos los derechos reservados.")}</p>
                        </div>
                        <nav aria-label={translate("Información legal")} className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
                            <Link href="/aviso-legal" className="hover:text-gold">{translate("Aviso legal")}</Link>
                            <Link href="/privacidad" className="hover:text-gold">{translate("Privacidad")}</Link>
                            <Link href="/cookies" className="hover:text-gold">{translate("Cookies")}</Link>
                            <Link href="/terminos" className="hover:text-gold">{translate("Condiciones")}</Link>
                        </nav>
                    </div>
                </footer>
                <CartDrawer />
            </div>
    )
}
