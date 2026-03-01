'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadStudentAvatar(formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File
    const childId = formData.get('childId') as string

    if (!file || !childId) {
        return { success: false, error: 'File and Student ID are required' }
    }

    // 1. Upload to Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${childId}-${Math.random()}.${fileExt}`
    const filePath = `student-avatars/${fileName}`

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

    // 3. Update Student Record
    const { error: updateError } = await supabase
        .from('children')
        .update({ avatar_url: publicUrl })
        .eq('id', childId)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true, url: publicUrl }
}

export async function updateStudentData(childId: string, data: any) {
    const supabase = await createClient()

    // 1. Update Child Data
    const { error: childError } = await supabase
        .from('children')
        .update({
            full_name: data.full_name,
            birth_date: data.birth_date || null,
            birth_year: data.birth_date ? new Date(data.birth_date).getFullYear() : undefined, // Update year if date provided
            address: data.address,
            notes: data.notes,
            category_id: (data.category_id && data.category_id !== "null") ? data.category_id : null
        })
        .eq('id', childId)

    if (childError) return { success: false, error: childError.message }

    // 2. Update Guardian Data (if provided and guardian exists)
    if (data.guardian_id) {
        const { error: guardianError } = await supabase
            .from('guardians')
            .update({
                full_name: data.guardian_name,
                phone: data.guardian_phone,
                email: data.guardian_email
            })
            .eq('id', data.guardian_id)

        if (guardianError) return { success: false, error: guardianError.message }
    } else if (data.guardian_name) {
        // 3. Create New Guardian (if ID missing but name provided)
        // Check if a user/guardian already exists with this email to avoid duplicates?
        // For now, simpler logic: Insert new guardian record.

        const { data: newGuardian, error: createGuardianError } = await supabase
            .from('guardians')
            .insert({
                full_name: data.guardian_name,
                phone: data.guardian_phone,
                email: data.guardian_email
            })
            .select()
            .single()

        if (createGuardianError) {
            console.error("Error creating guardian:", createGuardianError)
            return { success: false, error: "Error al crear tutor: " + createGuardianError.message }
        }

        if (newGuardian) {
            // Link to Child
            const { error: linkError } = await supabase
                .from('child_guardians')
                .insert({
                    child_id: childId,
                    guardian_id: newGuardian.id,
                    relationship: 'Tutor', // Default
                    is_primary: true // Default for first/new link
                })

            if (linkError) {
                console.error("Error linking guardian:", linkError)
                return { success: false, error: "Error al vincular tutor: " + linkError.message }
            }
        }
    }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}

export async function createStudent(data: any) {
    const supabase = await createClient()

    if (!data.birth_date) {
        return { success: false, error: "La fecha de nacimiento es obligatoria" }
    }

    const birthYear = new Date(data.birth_date).getFullYear()

    // 1. Create Child Record
    const { error: childError } = await supabase
        .from('children')
        .insert({
            full_name: data.full_name,
            birth_date: data.birth_date,
            birth_year: birthYear,
            category_id: (data.category_id && data.category_id !== "null") ? data.category_id : null
            // If guardian logic is complex, handle it later. For now, create the student.
        })

    if (childError) return { success: false, error: childError.message }

    revalidatePath('/admin/crm/alumnos')
    return { success: true }
}

export async function linkGuardianByEmail(childId: string, email: string) {
    const supabase = await createClient()

    // 1. Search for existing Guardian by Email
    const { data: existingGuardian } = await supabase
        .from('guardians')
        .select('id, full_name, email')
        .eq('email', email)
        .single()

    let guardianId = existingGuardian?.id

    // 2. If no guardian record, create a simplified guardian record.
    if (!guardianId) {
        const { data: newGuardian, error: createError } = await supabase
            .from('guardians')
            .insert({
                email: email,
                full_name: 'Tutor (Pendiente)', // Placeholders
                phone: '',
            })
            .select()
            .single()

        if (createError) {
            return { success: false, error: "No se encontró el tutor y falló la creación automática: " + createError.message }
        }
        guardianId = newGuardian.id
    }

    // 3. Check if link already exists
    const { data: existingLink } = await supabase
        .from('child_guardians')
        .select('*')
        .eq('child_id', childId)
        .eq('guardian_id', guardianId)
        .single()

    if (existingLink) {
        return { success: false, error: "Este tutor ya está vinculado al alumno." }
    }

    // 4. Link to Child
    const { error: linkError } = await supabase
        .from('child_guardians')
        .insert({
            child_id: childId,
            guardian_id: guardianId,
            relationship: 'Tutor',
            is_primary: false // Default to false for added links
        })

    if (linkError) {
        return { success: false, error: linkError.message }
    }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}

export async function unlinkGuardian(childId: string, guardianId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('child_guardians')
        .delete()
        .eq('child_id', childId)
        .eq('guardian_id', guardianId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath(`/admin/crm/alumnos/${childId}`)
    return { success: true }
}
