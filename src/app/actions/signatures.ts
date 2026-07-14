'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { requireAdmin, requireUser } from '@/lib/auth'

export async function createSignature(data: {
    guardianId: string;
    documentType: string;
    documentVersion: string;
    signatureBase64: string;
}) {
    const { supabase, user } = await requireUser()

    try {
        const { data: guardian } = await supabase
            .from('guardians')
            .select('id')
            .eq('id', data.guardianId)
            .eq('user_id', user.id)
            .single()
        if (!guardian) return { success: false, error: 'No autorizado' }

        if (!data.signatureBase64.startsWith('data:image/png;base64,') || data.signatureBase64.length > 3_000_000) {
            return { success: false, error: 'La firma no tiene un formato válido.' }
        }

        const base64Data = data.signatureBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${data.guardianId}/${randomUUID()}.png`;

        // Upload to bucket
        const { error: uploadError } = await supabase
            .storage
            .from('signatures')
            .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: false
            });

        if (uploadError) {
            console.error("Error uploading signature to storage:", uploadError);
            return { success: false, error: uploadError.message };
        }

        const requestHeaders = await headers()
        const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
        const { error: dbError } = await supabase
            .from('signatures')
            .insert([{
                guardian_id: data.guardianId,
                document_type: data.documentType,
                document_version: data.documentVersion,
                signature_image_path: fileName,
                ip_address: forwardedFor || null,
                user_agent: requestHeaders.get('user-agent')?.slice(0, 500) || null
            }]);

        if (dbError) {
            await supabase.storage.from('signatures').remove([fileName])
            console.error("Error saving signature record:", dbError);
            return { success: false, error: dbError.message };
        }

        revalidatePath('/portal/dashboard')
        return { success: true };

    } catch (error: any) {
        console.error("Unexpected error in createSignature:", error);
        return { success: false, error: error.message };
    }
}

export async function hasSignedDocument(guardianId: string, documentType: string, documentVersion: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('signatures')
        .select('id')
        .eq('guardian_id', guardianId)
        .eq('document_type', documentType)
        .eq('document_version', documentVersion)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
        console.error("Error checking signature status:", error);
        return false;
    }

    return !!data;
}

export async function getGuardiansSignatures(guardianIds: string[]) {
    const { supabase } = await requireAdmin()

    const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .in('guardian_id', guardianIds)
        .order('signed_at', { ascending: false });

    if (error) {
        console.error("Error fetching signatures:", error);
        return [];
    }

    return data || [];
}
