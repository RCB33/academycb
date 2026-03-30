import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Trophy } from "lucide-react"
import HeaderCart from "./components/header-cart"

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-navy/80 backdrop-blur supports-[backdrop-filter]:bg-navy/70">
                    <div className="container flex h-16 items-center justify-between">
                        <Link href="/" className="flex items-center space-x-3 font-bold text-xl tracking-tight">
                            <div className="relative h-12 w-12">
                                <Image
                                    src="/logo.jpg"
                                    alt="Academy Costa Brava Logo"
                                    width={48}
                                    height={48}
                                    className="object-contain" // removed border/rounded clipping
                                />
                            </div>
                            <span className="font-heading text-white">ACADEMY COSTA BRAVA</span>
                        </Link>

                        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-white">
                            <Link href="/academia" className="transition-colors hover:text-gold">Academia</Link>
                            <Link href="/campus" className="transition-colors hover:text-gold">Campus</Link>
                            <Link href="/torneos" className="transition-colors hover:text-gold">Torneos</Link>
                            <Link href="/tienda" className="transition-colors hover:text-gold">Tienda</Link>
                            <Link href="/contacto" className="transition-colors hover:text-gold">Contacto</Link>
                        </nav>

                        <div className="flex items-center space-x-2 md:space-x-4">
                            <HeaderCart />
                            <Link href="/portal">
                                <Button variant="outline" size="sm" className="hidden sm:flex border-white bg-white text-navy hover:bg-gray-100 hover:text-navy font-heading font-bold uppercase tracking-wide">
                                    Acceso Familias
                                </Button>
                            </Link>
                            <Link href="/contacto" className="hidden md:block">
                                <Button size="sm" className="bg-gold text-white hover:bg-gold-light hover:text-white">Inscribirse</Button>
                            </Link>
                        </div>
                    </div>
                </header>
                <main className="flex-1">
                    {children}
                </main>
            </div>
    )
}
