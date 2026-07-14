'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { z } from 'zod'

const ProductSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000),
    price: z.number().min(0),
    stock: z.number().int().min(0),
    sizes: z.array(z.string().trim().min(1).max(20)).max(20),
    image_url: z.string().url().refine((value) => value.startsWith('https://')),
    is_active: z.boolean()
})

function productImagePath(url?: string | null) {
    if (!url) return null
    const marker = '/product-images/'
    const index = url.indexOf(marker)
    if (index < 0) return null
    try {
        return decodeURIComponent(url.slice(index + marker.length).split('?')[0])
    } catch {
        return null
    }
}

export async function upsertProduct(data: {
    id?: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    sizes: string[];
    image_url: string;
    is_active: boolean;
}) {
    const { supabase } = await requireAdmin()
    const parsed = ProductSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: 'Datos del producto inválidos' }
    data = parsed.data

    if (data.id) {
        const { data: previous } = await supabase.from('store_products').select('image_url').eq('id', data.id).single()
        const { error } = await supabase.from('store_products').update(data).eq('id', data.id)
        if (error) return { success: false, error: error.message }
        if (previous?.image_url !== data.image_url) {
            const oldPath = productImagePath(previous?.image_url)
            if (oldPath) await supabase.storage.from('product-images').remove([oldPath])
        }
    } else {
        const { error } = await supabase.from('store_products').insert(data)
        if (error) return { success: false, error: error.message }
    }

    revalidatePath('/admin/tienda')
    revalidatePath('/portal/tienda')
    return { success: true }
}

export async function deleteProduct(id: string) {
    const { supabase } = await requireAdmin()
    const { data: product } = await supabase.from('store_products').select('image_url').eq('id', id).single()
    const { error } = await supabase.from('store_products').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    const path = productImagePath(product?.image_url)
    if (path) await supabase.storage.from('product-images').remove([path])

    revalidatePath('/admin/tienda')
    revalidatePath('/portal/tienda')
    return { success: true }
}
