'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const OrderSchema = z.object({
    customer_name: z.string().min(2, "El nombre es obligatorio"),
    customer_email: z.string().email("Email inválido"),
    customer_phone: z.string().min(6, "Teléfono inválido"),
    items: z.array(z.object({
        product_name: z.string(),
        quantity: z.number().min(1),
        price: z.number().min(0),
        size: z.string().optional()
    })).min(1, "El carrito está vacío"),
    total_amount: z.number().min(0)
})

export async function submitOrder(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // Extract items from hidden field or construct from separate inputs handled by Client Component
    // Ideally, the client component sends the full JSON, but Server Actions with Forms usually take FormData.
    // We can also accept a raw JSON object if we call it directly from JS, but let's stick to a structured approach.

    // Actually, for a cart checkout, passing a JSON object as an argument to the action is cleaner than FormData 
    // when we have nested arrays (items). Next.js Server Actions support direct arguments.

    return { error: "Use submitOrderJson instead" }
}

export async function submitOrderJson(data: {
    customer_name: string
    customer_email: string
    customer_phone: string
    items: { product_name: string; quantity: number; price: number; size?: string }[]
    total_amount: number
}) {
    const supabase = await createClient()

    const validated = OrderSchema.safeParse(data)

    if (!validated.success) {
        const errorMsg = validated.error.issues[0]?.message || "Datos incorrectos"
        return { success: false, error: errorMsg }
    }

    const { customer_name, customer_email, customer_phone, items, total_amount } = validated.data

    try {
        // 1. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_name,
                customer_email,
                customer_phone,
                total_amount,
                status: 'pending'
            })
            .select()
            .single()

        if (orderError) throw orderError

        // 2. Create Order Items
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null
        }))

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems)

        if (itemsError) throw itemsError

        return { success: true, orderId: order.id }

    } catch (error) {
        console.error('Order Error:', error)
        return { success: false, error: 'Error al procesar el pedido. Inténtalo de nuevo.' }
    }
}
