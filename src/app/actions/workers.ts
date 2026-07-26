'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WorkerAccessRole } from '@/lib/roles'

type WorkerAccessAuditAction =
    | 'invited'
    | 'reactivated'
    | 'updated'
    | 'revoked'
    | 'email_resent'
    | 'deleted'
    | 'auth_cleanup_failed'

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

async function logWorkerAccessChange(input: {
    workerId: string
    userId?: string | null
    actorId: string
    actorEmail?: string | null
    action: WorkerAccessAuditAction
    previousRole?: string | null
    newRole?: string | null
    details?: Record<string, unknown>
}) {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.from('worker_access_audit_log').insert({
        worker_id: input.workerId,
        user_id: input.userId || null,
        actor_id: input.actorId,
        actor_email: input.actorEmail || null,
        action: input.action,
        previous_role: input.previousRole || null,
        new_role: input.newRole || null,
        details: input.details || {},
    })
    if (error) console.error('Could not write worker access audit log:', error)
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
    let previousAuth: {
        email?: string
        user_metadata: Record<string, unknown>
        wasBanned: boolean
    } | null = null
    let previousProfile: { id: string; full_name: string | null; role: string } | null = null
    const { data: previousWorker } = await supabaseAdmin
        .from('workers')
        .select('user_id, access_enabled')
        .eq('id', input.workerId)
        .single()

    try {
        if (userId) {
            const [{ data: existingUser, error: existingUserError }, { data: profile }] = await Promise.all([
                supabaseAdmin.auth.admin.getUserById(userId),
                supabaseAdmin.from('profiles').select('id, full_name, role').eq('id', userId).maybeSingle(),
            ])
            if (existingUserError || !existingUser.user) {
                throw new Error('No se pudo localizar la cuenta vinculada.')
            }
            previousAuth = {
                email: existingUser.user.email,
                user_metadata: existingUser.user.user_metadata || {},
                wasBanned: Boolean(
                    existingUser.user.banned_until
                    && new Date(existingUser.user.banned_until).getTime() > Date.now()
                ),
            }
            previousProfile = profile

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
        if (profileError) throw new Error(profileError.message)

        const { data: linkedWorker, error: workerError } = await supabaseAdmin
            .from('workers')
            .update({ user_id: userId, access_enabled: true })
            .eq('id', input.workerId)
            .select('id')
            .single()
        if (workerError || !linkedWorker) {
            throw new Error(workerError?.message || 'No se pudo vincular la cuenta.')
        }
    } catch (error) {
        const rollbackErrors: string[] = []
        if (createdUser && userId) {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
            if (deleteError) rollbackErrors.push(deleteError.message)
        } else if (userId && previousAuth) {
            const { error: workerRollbackError } = await supabaseAdmin
                .from('workers')
                .update({
                    user_id: previousWorker?.user_id || null,
                    access_enabled: Boolean(previousWorker?.access_enabled),
                })
                .eq('id', input.workerId)
            if (workerRollbackError) rollbackErrors.push(workerRollbackError.message)

            if (previousProfile) {
                const { error: profileRollbackError } = await supabaseAdmin
                    .from('profiles')
                    .upsert(previousProfile, { onConflict: 'id' })
                if (profileRollbackError) rollbackErrors.push(profileRollbackError.message)
            } else {
                const { error: profileRollbackError } = await supabaseAdmin
                    .from('profiles')
                    .delete()
                    .eq('id', userId)
                if (profileRollbackError) rollbackErrors.push(profileRollbackError.message)
            }

            const { error: authRollbackError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email: previousAuth.email,
                ban_duration: previousAuth.wasBanned ? '876000h' : 'none',
                user_metadata: previousAuth.user_metadata,
            })
            if (authRollbackError) rollbackErrors.push(authRollbackError.message)
        }
        if (rollbackErrors.length > 0) {
            const originalMessage = error instanceof Error ? error.message : 'No se pudo actualizar el acceso.'
            throw new Error(`${originalMessage} La restauración automática también falló; revisa la cuenta antes de continuar.`)
        }
        throw error
    }

    return { userId, createdUser }
}

async function suspendWorkerAccess(userId: string) {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
    })
    if (error) throw new Error(`No se pudo revocar la cuenta: ${error.message}`)
}

async function reactivateWorkerAccess(userId: string) {
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
    })
    if (error) throw new Error(`No se pudo restaurar la cuenta: ${error.message}`)
}

export async function createWorker(formData: z.infer<typeof WorkerSchema>) {
    const { supabase, user } = await requireAdmin()
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
            const provisioned = await provisionWorkerAccess({
                workerId: newWorker.id,
                fullName: workerData.full_name,
                email: workerData.email,
                role: access_role,
            })
            await logWorkerAccessChange({
                workerId: newWorker.id,
                userId: provisioned.userId,
                actorId: user.id,
                actorEmail: user.email,
                action: 'invited',
                newRole: access_role,
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
    const { supabase, user } = await requireAdmin()
    const validated = WorkerSchema.safeParse(formData)

    if (!validated.success) {
        return { success: false, error: "Datos inválidos" }
    }

    if (validated.data.access_enabled && !validated.data.email) {
        return { success: false, error: "El email es obligatorio para activar el acceso" }
    }

    const { data: currentWorker, error: currentError } = await supabase
        .from('workers')
        .select('user_id, access_enabled, full_name, email, phone, position, color, avatar_url')
        .eq('id', id)
        .single()

    if (currentError || !currentWorker) {
        return { success: false, error: "Trabajador no encontrado" }
    }

    const { access_enabled, access_role, ...workerData } = validated.data
    const { data: currentProfile } = currentWorker.user_id
        ? await supabase.from('profiles').select('role').eq('id', currentWorker.user_id).maybeSingle()
        : { data: null }
    const previousRole = currentProfile?.role || null
    const previousWorkerData = {
        full_name: currentWorker.full_name,
        email: currentWorker.email,
        phone: currentWorker.phone,
        position: currentWorker.position,
        color: currentWorker.color,
        avatar_url: currentWorker.avatar_url,
    }
    const { error } = await supabase
        .from('workers')
        .update(workerData)
        .eq('id', id)

    if (error) {
        console.error('Error updating worker:', error)
        return { success: false, error: "Error al actualizar trabajador" }
    }

    let provisionedUserId = currentWorker.user_id
    try {
        if (access_enabled && workerData.email) {
            const provisioned = await provisionWorkerAccess({
                workerId: id,
                fullName: workerData.full_name,
                email: workerData.email,
                role: access_role,
                existingUserId: currentWorker.user_id,
            })
            provisionedUserId = provisioned.userId
        } else if (currentWorker.user_id && currentWorker.access_enabled) {
            await suspendWorkerAccess(currentWorker.user_id)
            const { error: disableError } = await supabase.from('workers').update({ access_enabled: false }).eq('id', id)
            if (disableError) {
                await reactivateWorkerAccess(currentWorker.user_id)
                throw new Error(`No se pudo actualizar la ficha: ${disableError.message}`)
            }
        }
    } catch (accessError) {
        const { error: rollbackError } = await supabase
            .from('workers')
            .update(previousWorkerData)
            .eq('id', id)
        const message = accessError instanceof Error ? accessError.message : 'No se pudo actualizar el acceso.'
        return {
            success: false,
            error: rollbackError
                ? `${message} Además, no se pudo restaurar la ficha; revisa este trabajador.`
                : message.includes('restauración automática también falló')
                    ? message
                    : `${message} No se ha guardado ningún cambio.`,
        }
    }

    if (access_enabled) {
        await logWorkerAccessChange({
            workerId: id,
            userId: provisionedUserId,
            actorId: user.id,
            actorEmail: user.email,
            action: !currentWorker.user_id
                ? 'invited'
                : currentWorker.access_enabled
                    ? 'updated'
                    : 'reactivated',
            previousRole,
            newRole: access_role,
            details: {
                email_changed: currentWorker.email !== workerData.email,
                name_changed: currentWorker.full_name !== workerData.full_name,
            },
        })
    } else if (currentWorker.user_id && currentWorker.access_enabled) {
        await logWorkerAccessChange({
            workerId: id,
            userId: currentWorker.user_id,
            actorId: user.id,
            actorEmail: user.email,
            action: 'revoked',
            previousRole,
            newRole: previousRole,
        })
    }

    revalidatePath('/admin/crm/trabajadores')
    return { success: true }
}

export async function deleteWorker(id: string) {
    const { supabase, user } = await requireAdmin()

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
            await logWorkerAccessChange({
                workerId: id,
                userId: worker.user_id,
                actorId: user.id,
                actorEmail: user.email,
                action: 'auth_cleanup_failed',
                details: { auth_error: deleteUserError.message },
            })
            revalidatePath('/admin/crm/trabajadores')
            return {
                success: true,
                warning: 'La ficha se eliminó y la cuenta quedó bloqueada, pero Supabase no pudo borrar la cuenta técnica. Se ha registrado para revisión.',
            }
        }
    }

    await logWorkerAccessChange({
        workerId: id,
        userId: worker.user_id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'deleted',
    })
    revalidatePath('/admin/crm/trabajadores')
    return { success: true }
}

export async function resendWorkerAccessEmail(id: string) {
    const { supabase, user } = await requireAdmin()
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
    await logWorkerAccessChange({
        workerId: id,
        userId: worker.user_id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'email_resent',
    })
    return { success: true }
}

export async function getWorkerAccessAudit() {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('worker_access_audit_log')
        .select('id, worker_id, actor_email, action, previous_role, new_role, details, created_at')
        .order('created_at', { ascending: false })
        .limit(12)

    if (error) {
        console.error('Error fetching worker access audit:', error)
        return []
    }
    return data || []
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
