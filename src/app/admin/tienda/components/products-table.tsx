'use client'

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Edit2, Trash2, Tag, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { upsertProduct, deleteProduct } from "@/app/actions/admin-shop"

export function ProductsTable({ products }: { products: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<any>({
        name: '', description: '', price: 0, stock: 0, sizes: 'S, M, L, XL', image_url: '', is_active: true
    })

    const openCreate = () => {
        setFormData({ name: '', description: '', price: 0, stock: 0, sizes: 'S, M, L, XL', image_url: '', is_active: true })
        setIsOpen(true)
    }

    const openEdit = (prod: any) => {
        setFormData({ ...prod, sizes: prod.sizes?.join(', ') || '' })
        setIsOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar producto?')) return
        const res = await deleteProduct(id)
        if (res.success) toast.success("Producto eliminado")
        else toast.error("Error al eliminar")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        const payload = {
            ...formData,
            price: Number(formData.price),
            stock: Number(formData.stock),
            sizes: formData.sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
        }

        const res = await upsertProduct(payload)
        setLoading(false)
        
        if (res.success) {
            toast.success("Producto guardado correctamente")
            setIsOpen(false)
        } else {
            toast.error(res.error || "Error al guardar")
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Input placeholder="Buscar producto en el catálogo..." className="bg-white" />
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" /> Añadir Producto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{formData.id ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nombre de la Prenda/Objeto</Label>
                                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Precio (€)</Label>
                                    <Input required type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unidades (Stock)</Label>
                                    <Input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Tallas (Separadas por comas)</Label>
                                <Input required placeholder="S, M, L, XL" value={formData.sizes} onChange={e => setFormData({...formData, sizes: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>URL de la Imagen</Label>
                                <Input required type="url" placeholder="https://..." value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <Label className="flex items-center cursor-pointer">
                                    <span className="mr-3">Activo en la tienda pública</span>
                                    <Switch checked={formData.is_active} onCheckedChange={checked => setFormData({...formData, is_active: checked})} />
                                </Label>
                            </div>
                            <Button disabled={loading} type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Guardar Producto
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {products.length === 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 text-slate-500 bg-white border border-dashed rounded-xl">
                        Aún no hay prendas en el catálogo. Añade una para empezar.
                    </div>
                )}
                {products.map(product => (
                    <Card key={product.id} className="overflow-hidden flex flex-col items-start border shadow-sm relative group">
                        <div className="w-full aspect-[4/3] bg-slate-100 flex-shrink-0 relative overflow-hidden">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 text-xs font-black rounded-full shadow-sm">
                                {product.price}€
                            </div>
                            {!product.is_active && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                    <Badge variant="destructive" className="font-bold">Oculto</Badge>
                                </div>
                            )}
                        </div>
                        <CardContent className="p-4 w-full flex-1">
                            <h3 className="font-bold text-slate-900 leading-tight mb-1">{product.name}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{product.description}</p>
                            
                            <div className="flex flex-wrap gap-1 mb-3">
                                {product.sizes?.map((size: string) => (
                                    <span key={size} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border">
                                        {size}
                                    </span>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center w-full mt-auto">
                                <div className="text-sm font-medium flex items-center gap-1.5 text-slate-600">
                                    <Tag className="w-3.5 h-3.5"/> Stock: <span className="font-bold text-slate-900">{product.stock}</span>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(product)} className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                                        <Edit2 className="h-3.5 w-3.5"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100">
                                        <Trash2 className="h-3.5 w-3.5"/>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
