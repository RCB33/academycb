"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { ShoppingCart, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { StoreProduct } from "@/lib/public-catalog"

export default function ShopSection({ products }: { products: StoreProduct[] }) {
    const { addToCart } = useCart()

    return (
        <section id="tienda" className="py-24 bg-white relative overflow-hidden">
            <div className="container relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div className="max-w-2xl">
                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary backdrop-blur-md mb-4 tracking-widest uppercase">
                            Equipación oficial
                        </span>
                        <h2 className="font-heading text-5xl md:text-7xl font-bold text-navy mb-4 uppercase">
                            Nuestra <span className="text-primary">Tienda</span>
                        </h2>
                        <p className="text-xl text-gray-600">
                            Viste los colores de la academia. Productos de alta calidad diseñados para el máximo rendimiento.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="hidden md:flex border-2 border-primary text-primary hover:bg-primary hover:text-white font-heading font-bold uppercase tracking-wider h-12 px-8">
                        <Link href="/tienda">Ver Catálogo Completo <ArrowRight className="ml-2 h-5 w-5" /></Link>
                    </Button>
                </div>

                {products.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                        <h3 className="font-heading text-2xl font-bold text-navy uppercase">Catálogo en preparación</h3>
                        <p className="mt-2 text-slate-500">Publicaremos aquí los productos disponibles cuando estén confirmados.</p>
                    </div>
                ) : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map((product) => (
                        <div key={product.id} className="group flex flex-col bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                            <div className="relative aspect-square overflow-hidden bg-gray-200">
                                <Image
                                    src={product.image_url || '/logo-academy.png'}
                                    alt={product.name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-navy/20 group-hover:bg-transparent transition-colors duration-300" />
                                <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                    <Button
                                        onClick={() => addToCart({ product_id: product.id, name: product.name, price: product.price, size: product.sizes?.[0] || 'Única', quantity: 1, image_url: product.image_url || '/logo-academy.png' })}
                                        size="icon"
                                        className="h-12 w-12 rounded-full bg-gold hover:bg-gold/90 text-navy shadow-lg"
                                    >
                                        <Plus className="h-6 w-6" />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-heading text-xl font-bold text-navy uppercase leading-tight">{product.name}</h3>
                                    <span className="font-heading text-xl font-bold text-primary">
                                        {product.price.toFixed(2)}€
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm mb-6 flex-1">
                                    {product.description}
                                </p>
                                <Button
                                    onClick={() => addToCart({ product_id: product.id, name: product.name, price: product.price, size: product.sizes?.[0] || 'Única', quantity: 1, image_url: product.image_url || '/logo-academy.png' })}
                                    className="w-full bg-navy hover:bg-navy-light text-white font-heading font-bold uppercase tracking-wider rounded-xl h-11"
                                >
                                    <ShoppingCart className="mr-2 h-4 w-4" /> Añadir al carrito
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>}

                <div className="mt-16 md:hidden">
                    <Button asChild className="w-full h-14 bg-primary text-white font-heading font-bold uppercase tracking-wider rounded-2xl">
                        <Link href="/tienda">Ver Catálogo Completo</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
