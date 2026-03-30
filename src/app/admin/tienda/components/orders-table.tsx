'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Filter, Box } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function OrdersTable({ orders }: { orders: any[] }) {
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar pedido por email o cliente..."
                        className="pl-8 bg-white"
                    />
                </div>
                <Button variant="outline" className="bg-white"><Filter className="mr-2 h-4 w-4" /> Filtros</Button>
            </div>

            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="pl-6">Ref</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!orders || orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No hay pedidos registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order: any) => (
                                    <TableRow key={order.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono text-xs pl-6 text-slate-500">
                                            {order.id.slice(0, 8).toUpperCase()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-slate-900">{order.customer_name}</div>
                                            <div className="text-xs text-muted-foreground">{order.customer_email} - {order.customer_phone}</div>
                                        </TableCell>
                                        <TableCell className="text-slate-600 text-sm">
                                            {format(new Date(order.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-black text-slate-900">{order.total_amount}€</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={
                                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                                            } variant="outline">
                                                {order.status === 'pending' ? 'Pendiente' :
                                                 order.status === 'completed' ? 'Entregado' : order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50">
                                                        Ver Detalles
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Detalles del Pedido</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="font-bold text-slate-500 block">Cliente</span>
                                                                {order.customer_name}
                                                            </div>
                                                            <div>
                                                                <span className="font-bold text-slate-500 block">Teléfono / Email</span>
                                                                {order.customer_phone} <br/> {order.customer_email}
                                                            </div>
                                                        </div>
                                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                            <div className="bg-slate-50 px-4 py-2 border-b font-bold text-sm text-slate-700">Artículos</div>
                                                            <div className="divide-y max-h-[300px] overflow-y-auto">
                                                                {order.order_items?.map((item: any) => (
                                                                    <div key={item.id} className="p-4 flex gap-3 items-center">
                                                                        <div className="h-10 w-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                                                                            <Box className="w-5 h-5"/>
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-bold text-sm truncate">{item.product_name}</div>
                                                                            <div className="text-xs text-slate-500">Talla: <span className="font-bold text-slate-700">{item.size || 'Única'}</span></div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-sm font-black">{item.price}€</div>
                                                                            <div className="text-xs text-slate-500">x{item.quantity} ud.</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {(!order.order_items || order.order_items.length === 0) && (
                                                                    <div className="p-4 text-sm text-slate-500 text-center">No hay desglose de artículos.</div>
                                                                )}
                                                            </div>
                                                            <div className="bg-slate-50 px-4 py-3 border-t flex justify-between items-center">
                                                                <span className="font-bold text-slate-700">Total pagado</span>
                                                                <span className="text-lg font-black text-indigo-700">{order.total_amount}€</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
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
