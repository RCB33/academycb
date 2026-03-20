'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Campus = {
    id: string
    name: string
    year: number
    type: 'verano' | 'invierno' | 'tecnificacion' | 'semana_santa'
    start_date: string
    end_date: string
    price: number | null
    capacity: number
    status: 'draft' | 'published' | 'closed'
    location: string | null
    description: string | null
    schedule: string | null
    created_at: string
    enrollment_count?: number
    confirmed_count?: number
}

export type CampusEnrollment = {
    id: string
    campus_id: string
    child_id: string
    status: 'reserved' | 'pending_payment' | 'confirmed' | 'cancelled'
    tshirt_size: string | null
    allergies: string | null
    emergency_contact: string | null
    emergency_phone: string | null
    notes: string | null
    created_at: string
    child?: {
        id: string
        full_name: string
        birth_year: number
        category?: { name: string } | null
    }
}

// ─── CAMPUS CRUD ───

export async function getCampuses() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('campuses')
        .select(`
            *,
            campus_enrollments(id, status)
        `)
        .order('start_date', { ascending: false })

    if (error) {
        console.error("Error fetching campuses:", error)
        return []
    }

    return (data || []).map((c: any) => ({
        ...c,
        enrollment_count: c.campus_enrollments?.length || 0,
        confirmed_count: c.campus_enrollments?.filter((e: any) => e.status === 'confirmed').length || 0,
        campus_enrollments: undefined
    })) as Campus[]
}

export async function createCampus(data: {
    name: string
    year: number
    type: string
    start_date: string
    end_date: string
    price?: number | null
    capacity: number
    status?: string
    location?: string | null
    description?: string | null
    schedule?: string | null
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('campuses')
        .insert([{
            name: data.name,
            year: data.year,
            type: data.type,
            start_date: data.start_date,
            end_date: data.end_date,
            price: data.price || null,
            capacity: data.capacity,
            status: data.status || 'draft',
            location: data.location || null,
            description: data.description || null,
            schedule: data.schedule || null
        }])

    if (error) {
        console.error("Error creating campus:", error)
        return { success: false, error: "Error al crear el campus" }
    }

    revalidatePath('/admin/campus')
    return { success: true }
}

export async function updateCampus(id: string, data: Partial<{
    name: string
    year: number
    type: string
    start_date: string
    end_date: string
    price: number | null
    capacity: number
    status: string
    location: string | null
    description: string | null
    schedule: string | null
}>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('campuses')
        .update(data)
        .eq('id', id)

    if (error) {
        console.error("Error updating campus:", error)
        return { success: false, error: "Error al actualizar el campus" }
    }

    revalidatePath('/admin/campus')
    return { success: true }
}

export async function deleteCampus(id: string) {
    const supabase = await createClient()

    // Check no enrollments
    const { count } = await supabase
        .from('campus_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('campus_id', id)

    if (count && count > 0) {
        return { success: false, error: `No se puede eliminar: tiene ${count} inscripciones. Elimina las inscripciones primero.` }
    }

    const { error } = await supabase
        .from('campuses')
        .delete()
        .eq('id', id)

    if (error) {
        console.error("Error deleting campus:", error)
        return { success: false, error: "Error al eliminar el campus" }
    }

    revalidatePath('/admin/campus')
    return { success: true }
}

// ─── ENROLLMENTS ───

export async function getCampusEnrollments(campusId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('campus_enrollments')
        .select(`
            *,
            child:children(id, full_name, birth_year, category:categories(name))
        `)
        .eq('campus_id', campusId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching enrollments:", error)
        return []
    }

    return (data || []) as CampusEnrollment[]
}

export async function enrollChild(data: {
    campus_id: string
    child_id: string
    tshirt_size?: string | null
    allergies?: string | null
    emergency_contact?: string | null
    emergency_phone?: string | null
    notes?: string | null
}) {
    const supabase = await createClient()

    // Check if already enrolled
    const { data: existing } = await supabase
        .from('campus_enrollments')
        .select('id')
        .eq('campus_id', data.campus_id)
        .eq('child_id', data.child_id)
        .maybeSingle()

    if (existing) {
        return { success: false, error: "Este niño ya está inscrito en este campus" }
    }

    // Check capacity
    const { count } = await supabase
        .from('campus_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('campus_id', data.campus_id)
        .neq('status', 'cancelled')

    const { data: campus } = await supabase
        .from('campuses')
        .select('capacity')
        .eq('id', data.campus_id)
        .single()

    if (campus && count !== null && count >= campus.capacity) {
        return { success: false, error: "El campus está lleno. No se pueden añadir más inscripciones." }
    }

    const { error } = await supabase
        .from('campus_enrollments')
        .insert([{
            campus_id: data.campus_id,
            child_id: data.child_id,
            status: 'pending_payment',
            tshirt_size: data.tshirt_size || null,
            allergies: data.allergies || null,
            emergency_contact: data.emergency_contact || null,
            emergency_phone: data.emergency_phone || null,
            notes: data.notes || null
        }])

    if (error) {
        console.error("Error enrolling child:", error)
        return { success: false, error: "Error al inscribir al niño" }
    }

    revalidatePath('/admin/campus')
    return { success: true }
}

export async function updateEnrollment(id: string, data: Partial<{
    status: string
    tshirt_size: string | null
    allergies: string | null
    emergency_contact: string | null
    emergency_phone: string | null
    notes: string | null
}>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('campus_enrollments')
        .update(data)
        .eq('id', id)

    if (error) {
        console.error("Error updating enrollment:", error)
        return { success: false, error: "Error al actualizar la inscripción" }
    }

    revalidatePath('/admin/campus')
    return { success: true }
}

export async function removeEnrollment(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('campus_enrollments')
        .delete()
        .eq('id', id)

    if (error) {
        console.error("Error removing enrollment:", error)
        return { success: false, error: "Error al eliminar la inscripción" }
    }

    revalidatePath('/admin/campus')
    return { success: true }
}

// ─── HELPERS ───

export async function getAvailableChildrenForCampus(campusId: string) {
    const supabase = await createClient()

    // Get children already enrolled
    const { data: enrolled } = await supabase
        .from('campus_enrollments')
        .select('child_id')
        .eq('campus_id', campusId)

    const enrolledIds = (enrolled || []).map(e => e.child_id)

    // Get all children not already enrolled
    let query = supabase
        .from('children')
        .select('id, full_name, birth_year, category:categories(name)')
        .order('full_name')

    if (enrolledIds.length > 0) {
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching available children:", error)
        return []
    }

    return data || []
}
