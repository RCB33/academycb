"use client"

import { useCart } from "@/context/cart-context"
import { X, ShoppingBag, Trash2, Plus, Minus, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { useState } from "react"
import { submitOrderJson } from "@/app/actions/shop"
import { toast } from "sonner"

export default function CartDrawer() {
    const {
        items: cart,
        isCartOpen,
        setIsCartOpen,
        removeFromCart: removeItem,
        updateQuantity,
        cartTotal: totalPrice,
        cartCount: totalItems,
        clearCart
    } = useCart()

    const [isCheckout, setIsCheckout] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    })

    if (!isCartOpen) return null

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await submitOrderJson({
                customer_name: formData.name,
                customer_email: formData.email,
                customer_phone: formData.phone,
                total_amount: totalPrice,
                items: cart.map(item => ({
                    product_name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    size: item.size
                }))
            })

            if (result.success) {
                toast.success("¡Pedido realizado con éxito!")
                clearCart()
                setIsCartOpen(false)
                setIsCheckout(false)
            } else {
                toast.error(result.error || "Error al procesar el pedido")
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-navy/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsCartOpen(false)}
            />

            <div className="absolute inset-y-0 right-0 max-w-full flex">
                <div className="relative w-screen max-w-md pointer-events-auto">
                    <div className="h-full flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-heading font-bold text-navy uppercase tracking-tight">
                                    {isCheckout ? 'Finalizar Compra' : `Tu Carrito (${totalItems})`}
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto py-6 px-6">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                        <ShoppingBag className="h-10 w-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-heading font-bold text-navy uppercase mb-2">Tu carrito está vacío</h3>
                                    <p className="text-gray-500 mb-8 max-w-[200px]">¡Añade algo de equipación para empezar!</p>
                                    <Button
                                        onClick={() => setIsCartOpen(false)}
                                        className="bg-navy hover:bg-navy-light text-white font-heading font-bold uppercase px-8"
                                    >
                                        Seguir comprando
                                    </Button>
                                </div>
                            ) : isCheckout ? (
                                // CHECKOUT FORM
                                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="name">Nombre Completo</Label>
                                            <Input
                                                id="name"
                                                required
                                                placeholder="Ej. Juan Pérez"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                placeholder="juan@ejemplo.com"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">Teléfono</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                required
                                                placeholder="+34 600 000 000"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Subtotal</span>
                                            <span>{totalPrice.toFixed(2)}€</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-navy text-base pt-2 border-t">
                                            <span>Total a Pagar</span>
                                            <span>{totalPrice.toFixed(2)}€</span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setIsCheckout(false)}
                                    >
                                        Volver al carrito
                                    </Button>
                                </form>
                            ) : (
                                // ITEMS LIST
                                <div className="space-y-6">
                                    {cart.map((item) => (
                                        <div key={item.id} className="flex gap-4 items-center">
                                            <div className="relative h-24 w-24 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 border">
                                                <Image
                                                    src={item.image_url || '/placeholder.png'}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between mb-1">
                                                    <h3 className="text-base font-heading font-bold text-navy uppercase truncate pr-4">{item.name}</h3>
                                                    <span className="font-heading font-bold text-primary">{item.price.toFixed(2)}€</span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-3">
                                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-8">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            className="px-2 hover:bg-gray-50 text-gray-500 border-r"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>
                                                        <span className="px-3 text-sm font-bold text-navy w-8 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            className="px-2 hover:bg-gray-50 text-gray-500 border-l"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer / Checkout */}
                        {cart.length > 0 && (
                            <div className="bg-gray-50 px-6 py-6 border-t font-heading">
                                {!isCheckout ? (
                                    <>
                                        <div className="flex justify-between text-base font-bold text-navy mb-1 uppercase tracking-tight">
                                            <span>Subtotal</span>
                                            <span>{totalPrice.toFixed(2)}€</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-6 font-sans">Impuestos incluidos. Envío calculado al finalizar pedido.</p>
                                        <Button
                                            onClick={() => setIsCheckout(true)}
                                            className="w-full h-14 bg-navy hover:bg-navy-light text-white font-bold uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-3"
                                        >
                                            <CreditCard className="h-5 w-5" /> Tramitar Pedido
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        form="checkout-form"
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-14 bg-primary hover:bg-primary-dark text-white font-bold uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-3"
                                    >
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Pedido"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
