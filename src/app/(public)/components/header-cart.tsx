"use client"

import { useCart } from "@/context/cart-context"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HeaderCart() {
    const { setIsCartOpen, totalItems } = useCart()

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-white/10"
            onClick={() => setIsCartOpen(true)}
        >
            <ShoppingBag className="h-6 w-6 text-navy" />
            {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-navy shadow-sm">
                    {totalItems}
                </span>
            )}
        </Button>
    )
}
