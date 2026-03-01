"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface CartItem {
    id: string
    name: string
    price: number
    image: string
    quantity: number
}

interface CartContextType {
    cart: CartItem[]
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    totalItems: number
    totalPrice: number
    isCartOpen: boolean
    setIsCartOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('academy-cart')
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart))
            } catch (e) {
                console.error("Failed to parse cart", e)
            }
        }
    }, [])

    // Save cart to localStorage on change
    useEffect(() => {
        localStorage.setItem('academy-cart', JSON.stringify(cart))
    }, [cart])

    const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === newItem.id)
            if (existing) {
                return prev.map(item =>
                    item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item
                )
            }
            return [...prev, { ...newItem, quantity: 1 }]
        })
        setIsCartOpen(true) // Open cart when item added
    }

    const removeItem = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id))
    }

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(id)
            return
        }
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, quantity } : item
        ))
    }

    const clearCart = () => {
        setCart([])
    }

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    return (
        <CartContext.Provider value={{
            cart,
            addItem,
            removeItem,
            updateQuantity,
            clearCart,
            totalItems,
            totalPrice,
            isCartOpen,
            setIsCartOpen
        }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
