'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSignature(data: {
    guardianId: string;
    documentType: string;
    documentVersion: string;
    signatureBase64: string;
}) {
    const supabase = await createClient()

    // 1. Convert base64 to buffer to upload as file (Optional, but good practice for storage)
    // For simplicity in this demo, we can just store the base64 string directly in the database, 
    // or upload to a bucket. We'll upload to a Supabase bucket 'signatures'.

    try {
        const base64Data = data.signatureBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${data.guardianId}_${data.documentType}_${Date.now()}.png`;

        // Upload to bucket
        const { data: uploadData, error: uploadError } = await supabase
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

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('signatures').getPublicUrl(fileName);

        // 2. Insert record into `signatures` table
        const { error: dbError } = await supabase
            .from('signatures')
            .insert([{
                guardian_id: data.guardianId,
                document_type: data.documentType,
                document_version: data.documentVersion,
                signature_image_url: publicUrl,
                ip_address: '0.0.0.0', // In a real app, extract this from headers
                user_agent: 'ClientBrowser' // In a real app, extract from headers
            }]);

        if (dbError) {
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
    const supabase = await createClient()

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
