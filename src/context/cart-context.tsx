'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n/client'

export type CartItem = {
    id: string; // unique ID for the cart item (product_id + size)
    product_id: string;
    name: string;
    price: number;
    size: string;
    quantity: number;
    image_url: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: Omit<CartItem, 'id'>) => void;
    removeFromCart: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
    cartTotal: number;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
    const translate = useT()
    const [items, setItems] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        setIsMounted(true)
        const savedCart = localStorage.getItem('academy_cart')
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart))
            } catch (e) {
                console.error('Failed to load cart', e)
            }
        }
    }, [])

    // Save to localStorage when items change
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem('academy_cart', JSON.stringify(items))
        }
    }, [items, isMounted])

    const addToCart = (newItem: Omit<CartItem, 'id'>) => {
        const id = `${newItem.product_id}-${newItem.size}`
        const alreadyInCart = items.some(item => item.id === id)
        setItems(currentItems => {
            if (currentItems.some(item => item.id === id)) {
                return currentItems.map(item => item.id === id
                    ? { ...item, quantity: item.quantity + newItem.quantity }
                    : item)
            }
            return [...currentItems, { ...newItem, id }]
        })
        toast.success(translate(alreadyInCart
            ? 'Añadida otra unidad al carrito.'
            : `${translate(newItem.name)} añadido al carrito.`))
        setIsCartOpen(true) // Open drawer automatically
    }

    const removeFromCart = (id: string) => {
        setItems(currentItems => currentItems.filter(item => item.id !== id))
    }

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity < 1) return removeFromCart(id)
        
        setItems(currentItems => 
            currentItems.map(item => item.id === id ? { ...item, quantity } : item)
        )
    }

    const clearCart = () => setItems([])

    const cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0)
    const cartCount = items.reduce((count, item) => count + item.quantity, 0)

    return (
        <CartContext.Provider value={{
            items,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            isCartOpen,
            setIsCartOpen,
            cartTotal,
            cartCount
        }}>
            {children}
        </CartContext.Provider>
    )
}

export const useCart = () => {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
