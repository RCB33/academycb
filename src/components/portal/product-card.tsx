'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/context/cart-context"

type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    sizes: string[];
    stock: number;
}

export function ProductCard({ product }: { product: Product }) {
    const { addToCart } = useCart()
    const [selectedSize, setSelectedSize] = useState<string>(product.sizes && product.sizes.length > 0 ? product.sizes[0] : '')

    const handleAddToCart = () => {
        addToCart({
            product_id: product.id,
            name: product.name,
            price: product.price,
            size: selectedSize || 'Única',
            quantity: 1,
            image_url: product.image_url || '/placeholder.png'
        })
    }

    return (
        <Card className="overflow-hidden flex flex-col group hover:shadow-xl transition-all border-slate-200/60">
            <div className="aspect-square bg-slate-100 relative overflow-hidden">
                <img
                    src={product.image_url || '/placeholder.png'}
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-black text-slate-900 shadow-sm">
                    {product.price.toFixed(2)} €
                </div>
                {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-red-600 text-white font-bold px-4 py-2 rounded-full transform -rotate-12 shadow-lg tracking-widest uppercase">
                            Agotado
                        </span>
                    </div>
                )}
            </div>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <p className="text-sm text-muted-foreground">{product.description}</p>
                
                {product.sizes && product.sizes.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Talla</span>
                        <div className="flex flex-wrap gap-2">
                            {product.sizes.map(size => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`h-8 min-w-[2rem] px-2 text-xs font-bold rounded-md border transition-colors ${
                                        selectedSize === size 
                                        ? 'bg-indigo-600 text-white border-indigo-600' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button 
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold border-none shadow-md shadow-indigo-600/20"
                >
                    <ShoppingCart className="mr-2 h-4 w-4" /> Comprar
                </Button>
            </CardFooter>
        </Card>
    )
}
