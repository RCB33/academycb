import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrdersTable } from "./components/orders-table"
import { ProductsTable } from "./components/products-table"
import { ShoppingBag, Box } from "lucide-react"

export default async function AdminStorePage() {
    const supabase = await createClient()

    const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })

    const { data: products } = await supabase
        .from('store_products')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Tienda</h1>
                <p className="text-muted-foreground">Administra los pedidos y el catálogo de la academia.</p>
            </div>
            
            <Tabs defaultValue="pedidos" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                    <TabsTrigger value="pedidos" className="flex gap-2">
                        <ShoppingBag className="w-4 h-4" /> Pedidos
                    </TabsTrigger>
                    <TabsTrigger value="catalogo" className="flex gap-2">
                        <Box className="w-4 h-4" /> Catálogo
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="pedidos">
                    <OrdersTable orders={orders || []} />
                </TabsContent>
                <TabsContent value="catalogo">
                    <ProductsTable products={products || []} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
