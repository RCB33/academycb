import { createClient } from '@/lib/supabase/server'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ShoppingBag, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default async function AdminOrdersPage() {
    const supabase = await createClient()

    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pedidos Tienda</h1>
                    <p className="text-muted-foreground">Gestiona las compras realizadas en la academia.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nombre o email..."
                        className="pl-8"
                    />
                </div>
                <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filtros</Button>
            </div>

            <Card>
                <CardHeader className="px-6 py-4 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        Listado de Pedidos
                    </CardTitle>
                    <CardDescription>
                        Mostrando {orders?.length || 0} pedidos recientes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ref</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!orders || orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No hay pedidos registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order: any) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-xs">
                                            {order.id.slice(0, 8)}...
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{order.customer_name}</div>
                                            <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(order.created_at), "d MMM yyyy", { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-bold">{order.total_amount}€</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                order.status === 'completed' ? 'default' :
                                                    order.status === 'pending' ? 'secondary' : 'outline'
                                            }>
                                                {order.status === 'pending' ? 'Pendiente' :
                                                    order.status === 'completed' ? 'Completado' : order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Ver Detalles</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
