'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const OrderSchema = z.object({
    customer_name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
    customer_email: z.string().trim().email("Email inválido").max(200),
    customer_phone: z.string().trim().min(6, "Teléfono inválido").max(30),
    items: z.array(z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
        size: z.string().trim().max(20).optional()
    })).min(1, "El carrito está vacío").max(20),
})

export async function submitOrderJson(data: {
    customer_name: string
    customer_email: string
    customer_phone: string
    items: { product_id: string; quantity: number; size?: string }[]
}) {
    const supabase = await createClient()

    const validated = OrderSchema.safeParse(data)

    if (!validated.success) {
        const errorMsg = validated.error.issues[0]?.message || "Datos incorrectos"
        return { success: false, error: errorMsg }
    }

    const { customer_name, customer_email, customer_phone, items } = validated.data

    try {
        const { data: orderId, error } = await supabase.rpc('place_store_order', {
            customer_name_input: customer_name,
            customer_email_input: customer_email,
            customer_phone_input: customer_phone,
            items_input: items
        })

        if (error) throw error
        return { success: true, orderId }

    } catch (error) {
        console.error('Order Error:', error)
        return { success: false, error: 'Error al procesar el pedido. Inténtalo de nuevo.' }
    }
}
