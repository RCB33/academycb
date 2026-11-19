'use client'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/cart-context'
import { useT } from '@/lib/i18n/client'

export function PortalCartButton() {
    const { cartCount, setIsCartOpen } = useCart()
    const t = useT()
    return <button type="button" onClick={() => setIsCartOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy px-5 py-3 font-bold text-white hover:bg-navy-light"><ShoppingBag className="h-5 w-5" />{t('Ver carrito')} <span className="rounded-full bg-gold px-2 py-0.5 text-sm text-navy">{cartCount}</span></button>
}
