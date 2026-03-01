'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadStudentDocument(formData: FormData) {
    const supabase = await createClient()

    const file = formData.get('file') as File
    const childId = formData.get('childId') as string
    const docName = formData.get('name') as string

    if (!file || !childId) {
        return { success: false, error: 'Faltan datos obligatorios' }
    }

    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${childId}/${Date.now()}.${fileExt}`
        const filePath = `documents/${fileName}`

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('student-documents')
            .upload(filePath, file)

        if (uploadError) {
            // If bucket doesn't exist, we might get an error here.
            throw new Error(`Error subiendo archivo: ${uploadError.message}`)
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('student-documents')
            .getPublicUrl(filePath)

        // 3. Register in Database (assuming table exists or creating record)
        const { error: dbError } = await supabase
            .from('child_documents')
            .insert({
                child_id: childId,
                name: docName || file.name,
                url: publicUrl,
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                type: fileExt
            })

        if (dbError) throw dbError

        revalidatePath(`/admin/crm/alumnos/${childId}`)
        return { success: true, url: publicUrl }

    } catch (error: any) {
        console.error('Upload Error:', error)
        return { success: false, error: error.message }
    }
}

export async function getStudentDocuments(childId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('child_documents')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })

    if (error) return []
    return data
}
