"use client"
import { useT } from '@/lib/i18n/client'


import { useCart } from "@/context/cart-context"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HeaderCart() {
    const translate = useT()

    const { setIsCartOpen, cartCount } = useCart()

    return (
        <Button
            aria-label={translate("Abrir carrito")}
            variant="ghost"
            size="icon"
            className="relative hover:bg-white/10"
            onClick={() => setIsCartOpen(true)}
        >
            <ShoppingBag className="h-6 w-6 text-white" />
            {translate(cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-navy shadow-sm">
                    {translate(cartCount)}
                </span>
            ))}
        </Button>
    )
}
