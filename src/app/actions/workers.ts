'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { requireAdmin } from '@/lib/auth'

const WorkerSchema = z.object({
    full_name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    phone: z.string().optional(),
    position: z.string().min(1, "El cargo es obligatorio"),
    color: z.string().default('blue'),
    avatar_url: z.string().optional().nullable()
})

export async function getWorkers() {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching workers:', error)
        return []
    }
    return data
}

export async function createWorker(formData: z.infer<typeof WorkerSchema>) {
    const { supabase } = await requireAdmin()
    const validated = WorkerSchema.safeParse(formData)

    if (!validated.success) {
        console.error("Validation error:", validated.error)
        return { success: false, error: "Datos inválidos" }
    }

    const { data: newWorker, error } = await supabase
        .from('workers')
        .insert(validated.data)
        .select()
        .single()

    if (error) {
        console.error('Error creating worker:', error)
        return { success: false, error: "Error al crear trabajador" }
    }

    revalidatePath('/admin/crm/trabajadores')
    return { success: true, id: newWorker.id }
}

export async function updateWorker(id: string, formData: z.infer<typeof WorkerSchema>) {
    const { supabase } = await requireAdmin()
    const validated = WorkerSchema.safeParse(formData)

    if (!validated.success) {
        return { success: false, error: "Datos inválidos" }
    }

    const { error } = await supabase
        .from('workers')
        .update(validated.data)
        .eq('id', id)

    if (error) {
        console.error('Error updating worker:', error)
        return { success: false, error: "Error al actualizar trabajador" }
    }

    revalidatePath('/admin/crm/trabajadores')
    return { success: true }
}

export async function deleteWorker(id: string) {
    const { supabase } = await requireAdmin()

    // First check if assigned to events? 
    // Ideally we should set null, but for now let's just delete
    const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting worker:', error)
        return { success: false, error: "Error al eliminar trabajador" }
    }

    revalidatePath('/admin/crm/trabajadores')
    return { success: true }
}

export async function uploadWorkerAvatar(formData: FormData) {
    const { supabase } = await requireAdmin()
    const file = formData.get('file') as File
    const workerId = formData.get('workerId') as string

    if (!file || !workerId) {
        return { success: false, error: 'Faltan el archivo o el trabajador.' }
    }

    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const fileExt = extensions[file.type]
    if (!fileExt || file.size > 8 * 1024 * 1024) {
        return { success: false, error: 'Solo se admiten JPG, PNG o WebP de hasta 8 MB.' }
    }

    // 1. Upload to Storage
    const fileName = `${workerId}-${randomUUID()}.${fileExt}`
    const filePath = `worker-avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(filePath, file)

    if (uploadError) {
        return { success: false, error: uploadError.message }
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('profile_images')
        .getPublicUrl(filePath)

    // 3. Update Worker Record
    const { error: updateError } = await supabase
        .from('workers')
        .update({ avatar_url: publicUrl })
        .eq('id', workerId)

    if (updateError) {
        await supabase.storage.from('profile_images').remove([filePath])
        return { success: false, error: updateError.message }
    }

    revalidatePath('/admin/crm/trabajadores')
    return { success: true, url: publicUrl }
}
