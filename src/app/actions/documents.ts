'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { randomUUID } from 'node:crypto'

export async function uploadStudentDocument(formData: FormData) {
    const { supabase } = await requireAdmin()

    const file = formData.get('file') as File
    const childId = formData.get('childId') as string
    const docName = formData.get('name') as string

    if (!file || !childId) {
        return { success: false, error: 'Faltan datos obligatorios' }
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
        return { success: false, error: 'Solo se admiten PDF, JPG o PNG de hasta 10 MB.' }
    }

    try {
        const fileExt = file.name.split('.').pop()
        const filePath = `${childId}/${randomUUID()}.${fileExt}`

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('student-documents')
            .upload(filePath, file)

        if (uploadError) {
            // If bucket doesn't exist, we might get an error here.
            throw new Error(`Error subiendo archivo: ${uploadError.message}`)
        }

        // Store only the private object path.
        const { error: dbError } = await supabase
            .from('child_documents')
            .insert({
                child_id: childId,
                name: docName || file.name,
                url: filePath,
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                type: fileExt
            })

        if (dbError) {
            await supabase.storage.from('student-documents').remove([filePath])
            throw dbError
        }

        revalidatePath(`/admin/crm/alumnos/${childId}`)
        return { success: true }

    } catch (error: any) {
        console.error('Upload Error:', error)
        return { success: false, error: error.message }
    }
}

export async function getStudentDocuments(childId: string) {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
        .from('child_documents')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })

    if (error) return []

    return Promise.all((data || []).map(async (document) => {
        if (document.url?.startsWith('http')) return document
        const { data: signed } = await supabase.storage.from('student-documents').createSignedUrl(document.url, 600)
        return { ...document, url: signed?.signedUrl || '' }
    }))
}
