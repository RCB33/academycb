import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"

export default async function TiendaPage() {
    const supabase = await createClient()

    // Mock products for the store
    const products = [
        {
            id: 1,
            name: "Equipación Principal Oficial",
            description: "Camiseta y pantalón de juego. Temporada actual.",
            price: 65.00,
            image: "https://images.unsplash.com/photo-1574629810360-7efcb4f285ad?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 2,
            name: "Chándal de Entrenamiento",
            description: "Chaqueta y pantalón largo oficial de la academia.",
            price: 55.00,
            image: "https://images.unsplash.com/photo-1542458428-111fbcdcd6c5?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 3,
            name: "Mochila Oficial",
            description: "Mochila deportiva con compartimento para botas.",
            price: 35.00,
            image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 4,
            name: "Sudadera de Paseo",
            description: "Sudadera de algodón premium con el logo bordado.",
            price: 45.00,
            image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop"
        }
    ]

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tienda Oficial</h1>
                <p className="text-muted-foreground mt-2">Equipa a tu jugador con el material oficial de la academia. Las compras se entregarán en el próximo entrenamiento.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map(product => (
                    <Card key={product.id} className="overflow-hidden flex flex-col group hover:shadow-xl transition-all border-slate-200/60">
                        <div className="aspect-square bg-slate-100 relative overflow-hidden">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-black text-slate-900 shadow-sm">
                                {product.price.toFixed(2)} €
                            </div>
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold">{product.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                        </CardContent>
                        <CardFooter className="pt-0">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold border-none shadow-md shadow-indigo-600/20">
                                <ShoppingCart className="mr-2 h-4 w-4" /> Comprar
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
                <h3 className="font-bold text-indigo-900 mb-2">¿Necesitas ayuda con las tallas?</h3>
                <p className="text-sm text-indigo-700">Consulta en secretaría o con el entrenador antes de realizar el pedido para probarte las prendas de muestra.</p>
            </div>
        </div>
    )
}
