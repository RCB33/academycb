'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAccessActivationStatuses } from '@/lib/auth/access-activation'

export async function getGuardians() {
    const { supabase } = await requireAdmin()

    const { data: guardians, error } = await supabase
        .from('guardians')
        .select(`
            *,
            children:child_guardians(
                child:children(
                    id, 
                    full_name, 
                    category:categories(name)
                )
            )
        `)
        .order('full_name')

    if (error) {
        console.error('Error fetching guardians:', error)
        return []
    }

    const activationStatuses = await getAccessActivationStatuses(
        (guardians || []).flatMap((guardian) => guardian.user_id ? [guardian.user_id] : [])
    )

    return (guardians || []).map((guardian) => ({
        ...guardian,
        access_activation: guardian.user_id ? activationStatuses.get(guardian.user_id) || null : null,
    }))
}

export async function getGuardianById(id: string) {
    const { supabase } = await requireAdmin()

    const { data: guardian, error } = await supabase
        .from('guardians')
        .select(`
            *,
            children:child_guardians(
                child:children(
                    id, 
                    full_name, 
                    birth_year,
                    category:categories(name)
                ),
                relationship,
                is_primary
            )
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching guardian by id:', error)
        return null
    }

    const activationStatuses = await getAccessActivationStatuses(guardian.user_id ? [guardian.user_id] : [])
    return {
        ...guardian,
        access_activation: guardian.user_id ? activationStatuses.get(guardian.user_id) || null : null,
    }
}

export async function createGuardian(data: { full_name: string; email: string; phone: string; notes?: string; createPortalAccount?: boolean }) {
    const { supabase } = await requireAdmin()

    let authUserId = null;

    if (data.createPortalAccount && data.email) {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return { success: false, error: 'Configuración del servidor incompleta (falta clave administrativa).' }
        }

        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            data.email.trim(),
            {
                data: { full_name: data.full_name, intended_role: 'guardian', password_set: false },
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/portal/establecer-contrasena`
            }
        );

        if (authError) {
            console.error("Auth invitation error:", authError);
            if (authError.message.includes('already')) {
                return { success: false, error: 'Ya existe un usuario con este correo electrónico.' }
            }
            return { success: false, error: 'Error al enviar la invitación de acceso: ' + authError.message }
        }

        authUserId = authData.user.id;
    }

    const { data: newGuardian, error } = await supabase
        .from('guardians')
        .insert({
            user_id: authUserId,
            full_name: data.full_name,
            email: data.email || null,
            phone: data.phone || '',
            notes: data.notes || null
        })
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/crm/tutores')
    return { success: true, guardian: newGuardian }
}

export async function updateGuardian(id: string, data: { full_name: string; email: string; phone: string; notes?: string }) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase
        .from('guardians')
        .update({
            full_name: data.full_name,
            email: data.email || null,
            phone: data.phone || '',
            notes: data.notes || null
        })
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/crm/tutores')
    revalidatePath(`/admin/crm/tutores/${id}`)
    return { success: true }
}

export async function deleteGuardian(id: string) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase
        .from('guardians')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/crm/tutores')
    return { success: true }
}

export async function resetTutorPassword(userId: string) {
    await requireAdmin()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Configuración del servidor incompleta (falta clave administrativa).' }
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError || !targetUser.user?.email) {
        return { success: false, error: 'No se ha podido localizar la cuenta del tutor.' }
    }

    const { error: authError } = await supabaseAdmin.auth.resetPasswordForEmail(
        targetUser.user.email,
        { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/portal/establecer-contrasena` }
    );

    if (authError) {
        console.error("Password recovery error:", authError);
        return { success: false, error: 'Error al enviar el correo de recuperación: ' + authError.message }
    }

    return { success: true }
}

export async function updateGuardianNotes(id: string, notes: string | null) {
    const { supabase } = await requireAdmin()

    const { error } = await supabase
        .from('guardians')
        .update({
            notes: notes
        })
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/crm/tutores')
    revalidatePath(`/admin/crm/tutores/${id}`)
    return { success: true }
}
