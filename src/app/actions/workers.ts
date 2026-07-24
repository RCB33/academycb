'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WorkerAccessRole } from '@/lib/roles'

const WorkerSchema = z.object({
    full_name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
    email: z.string().trim().email("Email inválido").max(200).optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional(),
    position: z.string().trim().min(2, "El cargo es obligatorio").max(120),
    color: z.string().default('blue'),
    avatar_url: z.string().url().optional().nullable(),
    access_enabled: z.boolean().default(false),
    access_role: z.enum(['staff', 'finance', 'marketing', 'coach']).default('coach'),
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
    const userIds = (data || []).flatMap((worker) => worker.user_id ? [worker.user_id] : [])
    const rolesByUser = new Map<string, WorkerAccessRole>()

    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role')
            .in('id', userIds)

        for (const profile of profiles || []) {
            if (['staff', 'finance', 'marketing', 'coach'].includes(profile.role)) {
                rolesByUser.set(profile.id, profile.role as WorkerAccessRole)
            }
        }
    }

    return (data || []).map((worker) => ({
        ...worker,
        access_role: worker.user_id ? rolesByUser.get(worker.user_id) || 'coach' : 'coach',
        access_enabled: Boolean(worker.user_id && worker.access_enabled),
    }))
}

function getSiteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

async function provisionWorkerAccess(input: {
    workerId: string
    fullName: string
    email: string
    role: WorkerAccessRole
    existingUserId?: string | null
}) {
    const supabaseAdmin = createAdminClient()
    let userId = input.existingUserId || null
    let createdUser = false

    if (userId) {
        const { data: existingUser, error: existingUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (existingUserError || !existingUser.user) {
            throw new Error('No se pudo localizar la cuenta vinculada.')
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: input.email,
            ban_duration: 'none',
            user_metadata: {
                ...existingUser.user.user_metadata,
                full_name: input.fullName,
            },
        })
        if (error) throw new Error(`No se pudo reactivar la cuenta: ${error.message}`)
    } else {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
            data: {
                full_name: input.fullName,
                intended_role: input.role,
                password_set: false,
            },
            redirectTo: `${getSiteUrl()}/portal/establecer-contrasena`,
        })

        if (error) {
            if (error.message.toLowerCase().includes('already')) {
                throw new Error('Ya existe una cuenta con ese correo. No se ha vinculado automáticamente por seguridad.')
            }
            throw new Error(`No se pudo enviar la invitación: ${error.message}`)
        }

        userId = data.user.id
        createdUser = true
    }

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, full_name: input.fullName, role: input.role }, { onConflict: 'id' })

    const { error: workerError } = await supabaseAdmin
        .from('workers')
        .update({ user_id: userId, access_enabled: true })
        .eq('id', input.workerId)

    if (profileError || workerError) {
        if (createdUser) await supabaseAdmin.auth.admin.deleteUser(userId)
        throw new Error(profileError?.message || workerError?.message || 'No se pudo vincular la cuenta.')
    }
}

async function suspendWorkerAccess(userId: string) {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
    })
    if (error) throw new Error(`No se pudo revocar la cuenta: ${error.message}`)
}

export async function createWorker(formData: z.infer<typeof WorkerSchema>) {
    const { supabase } = await requireAdmin()
    const validated = WorkerSchema.safeParse(formData)

    if (!validated.success) {
        console.error("Validation error:", validated.error)
        return { success: false, error: "Datos inválidos" }
    }

    if (validated.data.access_enabled && !validated.data.email) {
        return { success: false, error: "El email es obligatorio para activar el acceso" }
    }

    const { access_enabled, access_role, ...workerData } = validated.data
    const { data: newWorker, error } = await supabase
        .from('workers')
        .insert({ ...workerData, access_enabled: false })
        .select()
        .single()

    if (error) {
        console.error('Error creating worker:', error)
        return { success: false, error: "Error al crear trabajador" }
    }

    if (access_enabled && workerData.email) {
        try {
            await provisionWorkerAccess({
                workerId: newWorker.id,
                fullName: workerData.full_name,
                email: workerData.email,
                role: access_role,
            })
        } catch (accessError) {
            await supabase.from('workers').delete().eq('id', newWorker.id)
            return { success: false, error: accessError instanceof Error ? accessError.message : 'No se pudo crear el acceso.' }
        }
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

    if (validated.data.access_enabled && !validated.data.email) {
        return { success: false, error: "El email es obligatorio para activar el acceso" }
    }

    const { data: currentWorker, error: currentError } = await supabase
        .from('workers')
        .select('user_id, access_enabled')
        .eq('id', id)
        .single()

    if (currentError || !currentWorker) {
        return { success: false, error: "Trabajador no encontrado" }
    }

    const { access_enabled, access_role, ...workerData } = validated.data
    const { error } = await supabase
        .from('workers')
        .update(workerData)
        .eq('id', id)

    if (error) {
        console.error('Error updating worker:', error)
        return { success: false, error: "Error al actualizar trabajador" }
    }

    try {
        if (access_enabled && workerData.email) {
            await provisionWorkerAccess({
                workerId: id,
                fullName: workerData.full_name,
                email: workerData.email,
                role: access_role,
                existingUserId: currentWorker.user_id,
            })
        } else if (currentWorker.user_id && currentWorker.access_enabled) {
            await suspendWorkerAccess(currentWorker.user_id)
            const { error: disableError } = await supabase.from('workers').update({ access_enabled: false }).eq('id', id)
            if (disableError) throw new Error(`La cuenta se ha bloqueado, pero no se pudo actualizar la ficha: ${disableError.message}`)
        }
    } catch (accessError) {
        return { success: false, error: accessError instanceof Error ? accessError.message : 'No se pudo actualizar el acceso.' }
    }

    revalidatePath('/admin/crm/trabajadores')
    return { success: true }
}

export async function deleteWorker(id: string) {
    const { supabase } = await requireAdmin()

    const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('user_id')
        .eq('id', id)
        .single()

    if (workerError || !worker) return { success: false, error: "Trabajador no encontrado" }

    const [{ count: teamCount }, { count: eventCount }] = await Promise.all([
        supabase.from('teams').select('id', { count: 'exact', head: true }).eq('coach_id', id),
        supabase.from('calendar_event_workers').select('event_id', { count: 'exact', head: true }).eq('worker_id', id),
    ])

    if ((teamCount || 0) > 0 || (eventCount || 0) > 0) {
        return {
            success: false,
            error: 'No se puede eliminar porque tiene equipos o eventos asociados. Revoca su acceso y conserva el historial.',
        }
    }

    if (worker.user_id) {
        try {
            await suspendWorkerAccess(worker.user_id)
        } catch (accessError) {
            return { success: false, error: accessError instanceof Error ? accessError.message : 'No se pudo revocar el acceso.' }
        }
    }

    const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting worker:', error)
        return { success: false, error: "Error al eliminar trabajador" }
    }

    if (worker.user_id) {
        const supabaseAdmin = createAdminClient()
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(worker.user_id)
        if (deleteUserError) {
            console.error('Worker deleted but auth cleanup failed:', deleteUserError)
        }
    }

    revalidatePath('/admin/crm/trabajadores')
    return { success: true }
}

export async function resendWorkerAccessEmail(id: string) {
    const { supabase } = await requireAdmin()
    const { data: worker, error } = await supabase
        .from('workers')
        .select('email, user_id, access_enabled')
        .eq('id', id)
        .single()

    if (error || !worker?.user_id || !worker.email) {
        return { success: false, error: 'Este trabajador todavía no tiene una cuenta vinculada.' }
    }
    if (!worker.access_enabled) {
        return { success: false, error: 'Reactiva primero el acceso del trabajador.' }
    }

    const supabaseAdmin = createAdminClient()
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(worker.email, {
        redirectTo: `${getSiteUrl()}/portal/establecer-contrasena`,
    })

    if (resetError) return { success: false, error: `No se pudo enviar el correo: ${resetError.message}` }
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
