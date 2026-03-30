import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/portal/product-card'

export default async function TiendaPage() {
    const supabase = await createClient()

    const { data: dbProducts } = await supabase
        .from('store_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    const products = dbProducts || []

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tienda Oficial</h1>
                <p className="text-muted-foreground mt-2">Equipa a tu jugador con el material oficial de la academia. Las compras se entregarán en el próximo entrenamiento.</p>
            </div>

            {products.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl border border-dashed text-slate-500">
                    No hay productos disponibles en este momento. Vuelve más tarde.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((product: any) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
                <h3 className="font-bold text-indigo-900 mb-2">¿Necesitas ayuda con las tallas?</h3>
                <p className="text-sm text-indigo-700">Consulta en secretaría o con el entrenador antes de realizar el pedido para probarte las prendas de muestra.</p>
            </div>
        </div>
    )
}
