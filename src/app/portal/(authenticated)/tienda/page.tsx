import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/portal/product-card'
import { ShoppingBag } from 'lucide-react'
import { PortalPageHeader } from '@/components/portal/portal-page-header'

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
            <PortalPageHeader icon={<ShoppingBag className="h-6 w-6" />} title="Tienda oficial" description="Material oficial Academy para tus jugadores, con entrega coordinada por la academia." />

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

            <div className="rounded-2xl border border-gold/30 bg-gold/10 p-6 text-center">
                <h3 className="mb-2 font-bold text-navy">¿Necesitas ayuda con las tallas?</h3>
                <p className="text-sm text-navy/75">Consulta en secretaría o con el entrenador antes de realizar el pedido para probarte las prendas de muestra.</p>
            </div>
        </div>
    )
}
