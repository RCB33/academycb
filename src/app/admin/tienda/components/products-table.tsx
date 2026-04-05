'use client'

import { useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Edit2, Trash2, Tag, Loader2, Link as LinkIcon, Upload, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { upsertProduct, deleteProduct } from "@/app/actions/admin-shop"
import { createClient } from "@/lib/supabase/client"

type ImageMode = 'url' | 'file'

export function ProductsTable({ products }: { products: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [imageMode, setImageMode] = useState<ImageMode>('url')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [formData, setFormData] = useState<any>({
        name: '', description: '', price: 0, stock: 0, sizes: 'S, M, L, XL', image_url: '', is_active: true
    })

    const supabase = createClient()

    const openCreate = () => {
        setFormData({ name: '', description: '', price: 0, stock: 0, sizes: 'S, M, L, XL', image_url: '', is_active: true })
        setImageMode('url')
        setSelectedFile(null)
        setPreviewUrl(null)
        setIsOpen(true)
    }

    const openEdit = (prod: any) => {
        setFormData({ ...prod, sizes: prod.sizes?.join(', ') || '' })
        setImageMode('url')
        setSelectedFile(null)
        setPreviewUrl(null)
        setIsOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar producto?')) return
        const res = await deleteProduct(id)
        if (res.success) toast.success("Producto eliminado")
        else toast.error("Error al eliminar")
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("La imagen es demasiado grande. Máximo 10MB.")
                return
            }
            setSelectedFile(file)
            // Generate preview
            const reader = new FileReader()
            reader.onloadend = () => setPreviewUrl(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        let finalImageUrl = formData.image_url

        // If file mode, upload first
        if (imageMode === 'file' && selectedFile) {
            const fileExt = selectedFile.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
            const filePath = `products/${fileName}`

            const { error: uploadError } = await supabase
                .storage
                .from('product-images')
                .upload(filePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                toast.error("Error al subir imagen: " + uploadError.message)
                setLoading(false)
                return
            }

            const { data: urlData } = supabase
                .storage
                .from('product-images')
                .getPublicUrl(filePath)

            finalImageUrl = urlData.publicUrl
        }

        if (!finalImageUrl && imageMode === 'url') {
            toast.error("Añade una URL de imagen o sube un archivo")
            setLoading(false)
            return
        }

        const payload = {
            ...formData,
            image_url: finalImageUrl,
            price: Number(formData.price),
            stock: Number(formData.stock),
            sizes: formData.sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
        }

        const res = await upsertProduct(payload)
        setLoading(false)

        if (res.success) {
            toast.success("Producto guardado correctamente")
            setIsOpen(false)
            setSelectedFile(null)
            setPreviewUrl(null)
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
                <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) { setSelectedFile(null); setPreviewUrl(null) } }}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" /> Añadir Producto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] p-0 border-0 overflow-hidden bg-slate-50 sm:rounded-2xl">
                        <div className="bg-indigo-600 p-5 flex flex-col items-center">
                            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                                <Tag className="h-6 w-6 text-white" />
                            </div>
                            <DialogTitle className="text-lg font-black text-white tracking-tight uppercase">
                                {formData.id ? 'Editar Producto' : 'Nuevo Producto'}
                            </DialogTitle>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Nombre de la Prenda/Objeto *</Label>
                                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Descripción</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-white resize-none" rows={2} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Precio (€)</Label>
                                    <Input required type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Unidades (Stock)</Label>
                                    <Input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="bg-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Tallas (Separadas por comas)</Label>
                                <Input required placeholder="S, M, L, XL" value={formData.sizes} onChange={e => setFormData({...formData, sizes: e.target.value})} className="bg-white" />
                            </div>

                            {/* Image: URL or Upload toggle */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-xs tracking-wider">Imagen del Producto *</Label>
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setImageMode('url')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all
                                            ${imageMode === 'url' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <LinkIcon className="h-3.5 w-3.5" /> URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImageMode('file')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all
                                            ${imageMode === 'file' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Upload className="h-3.5 w-3.5" /> Subir Imagen
                                    </button>
                                </div>

                                {imageMode === 'url' ? (
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="url"
                                            placeholder="https://..."
                                            value={formData.image_url}
                                            onChange={e => setFormData({...formData, image_url: e.target.value})}
                                            className="pl-9 bg-white"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                        {selectedFile && previewUrl ? (
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-green-200">
                                                <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</p>
                                                    <p className="text-[10px] text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-400 hover:text-red-500"
                                                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full p-6 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center gap-2 group"
                                            >
                                                <div className="h-12 w-12 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                                    <ImageIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                                </div>
                                                <p className="text-sm font-bold text-slate-500 group-hover:text-slate-700">Haz clic para seleccionar una imagen</p>
                                                <p className="text-[10px] text-slate-400">JPG, PNG, WebP • Máximo 10 MB</p>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <Label className="flex items-center cursor-pointer">
                                    <span className="mr-3 text-sm font-medium">Activo en la tienda pública</span>
                                    <Switch checked={formData.is_active} onCheckedChange={checked => setFormData({...formData, is_active: checked})} />
                                </Label>
                            </div>
                            <div className="pt-3 flex justify-end gap-3 border-t">
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                                <Button disabled={loading} type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Guardar Producto
                                </Button>
                            </div>
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
