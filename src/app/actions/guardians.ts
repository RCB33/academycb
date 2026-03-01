'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getGuardians() {
    const supabase = await createClient()

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

    return guardians
}

export async function getGuardianById(id: string) {
    const supabase = await createClient()

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

    return guardian
}

export async function createGuardian(data: { full_name: string; email: string; phone: string; notes?: string; createPortalAccount?: boolean }) {
    const supabase = await createClient()

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

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email.trim(),
            password: 'CostaBrava2026',
            email_confirm: true,
            user_metadata: {
                full_name: data.full_name
            }
        });

        if (authError) {
            console.error("Auth creation error:", authError);
            if (authError.message.includes('already exists')) {
                return { success: false, error: 'Ya existe un usuario con este correo electrónico.' }
            }
            return { success: false, error: 'Error al crear la cuenta de acceso familiar: ' + authError.message }
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
    const supabase = await createClient()

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
    const supabase = await createClient()

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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Configuración del servidor incompleta (falta clave administrativa).' }
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: 'CostaBrava2026'
    });

    if (authError) {
        console.error("Auth update error:", authError);
        return { success: false, error: 'Error al reiniciar la contraseña: ' + authError.message }
    }

    return { success: true }
}

export async function updateGuardianNotes(id: string, notes: string | null) {
    const supabase = await createClient()

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
