import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type StoreProduct = {
    id: string
    name: string
    description: string
    price: number
    stock: number
    sizes: string[]
    image_url: string | null
}

export async function getPublicProducts(): Promise<StoreProduct[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('store_products')
        .select('id, name, description, price, stock, sizes, image_url')
        .eq('is_active', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Unable to load store products:', error)
        return []
    }

    return (data || []).map((product) => ({
        ...product,
        price: Number(product.price)
    }))
}
