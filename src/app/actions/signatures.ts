'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireAdmin, requireUser } from '@/lib/auth'
import { GENERAL_DOCUMENT, IMAGE_DOCUMENT, CONSENT_VERSION } from '@/lib/image-consent'

const imageConsentOptionsSchema = z.object({
    portal_internal: z.boolean(),
    public_communications: z.boolean(),
})

const playerConsentSchema = z.object({ childId: z.string().uuid(), options: imageConsentOptionsSchema })

const signatureSchema = z.object({
    guardianId: z.string().uuid(),
    childId: z.string().uuid().optional(),
    documentType: z.enum(['Condiciones Generales Academia', 'Autorización de imagen y vídeo']),
    documentVersion: z.string().min(1).max(40),
    signatureBase64: z.string().max(3_000_000),
    consentOptions: imageConsentOptionsSchema.optional(),
    playerConsents: z.array(playerConsentSchema).max(30).optional(),
    confirmed: z.boolean().optional(),
}).superRefine((value, context) => {
    if (value.playerConsents && value.confirmed !== true) context.addIssue({ code: 'custom', message: 'Confirma tus decisiones.' })
    const isImageConsent = value.documentType === 'Autorización de imagen y vídeo'
    if (isImageConsent && value.playerConsents) context.addIssue({ code: 'custom', message: 'Documento no válido.' })
    if (isImageConsent && !value.childId) {
        context.addIssue({ code: 'custom', message: 'Falta el jugador de la autorización.' })
    }
    if (isImageConsent && !value.consentOptions) {
        context.addIssue({ code: 'custom', message: 'Faltan las opciones de autorización.' })
    }
    if (!isImageConsent && (value.childId || value.consentOptions)) {
        context.addIssue({ code: 'custom', message: 'Documento no válido.' })
    }
})

export async function createSignature(input: unknown) {
    const { supabase, user } = await requireUser()
    const parsed = signatureSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Los datos del documento no son válidos.' }
    const data = parsed.data

    try {
        const { data: guardian } = await supabase
            .from('guardians')
            .select('id')
            .eq('id', data.guardianId)
            .eq('user_id', user.id)
            .single()
        if (!guardian) return { success: false, error: 'No autorizado' }

        if (data.childId) {
            const { data: relationship } = await supabase
                .from('child_guardians')
                .select('child_id')
                .eq('guardian_id', data.guardianId)
                .eq('child_id', data.childId)
                .maybeSingle()
            if (!relationship) return { success: false, error: 'No puedes firmar documentos para este jugador.' }
        }

        if (data.playerConsents) {
            const { data: links, error } = await supabase.from('child_guardians').select('child_id').eq('guardian_id', guardian.id)
            const ids = data.playerConsents.map(p => p.childId)
            if (error || new Set(ids).size !== ids.length || ids.some(id => !links?.some(l => l.child_id === id))) {
                return { success: false, error: 'Revisa los jugadores de la autorización.' }
            }
        }

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
        const signedAt = new Date().toISOString()
        const evidence = { signed_at: signedAt, signature_image_path: fileName, ip_address: forwardedFor || null, user_agent: requestHeaders.get('user-agent')?.slice(0, 500) || null }
        const { error: dbError } = await supabase
            .from('signatures')
            .insert([{
                guardian_id: data.guardianId,
                child_id: data.childId || null,
                document_type: data.documentType,
                document_version: data.playerConsents ? CONSENT_VERSION : data.documentVersion,
                consent_options: data.consentOptions || {},
                ...evidence,
            }, ...(data.playerConsents || []).map(choice => ({
                guardian_id: data.guardianId, child_id: choice.childId, document_type: IMAGE_DOCUMENT,
                document_version: CONSENT_VERSION, consent_options: choice.options, ...evidence,
            }))]);

        if (dbError) {
            await supabase.storage.from('signatures').remove([fileName])
            console.error("Error saving signature record:", dbError);
            return { success: false, error: dbError.message };
        }

        // Withdrawal is applied transactionally by the database trigger.
        revalidatePath('/portal', 'layout')
        revalidatePath('/portal/dashboard')
        revalidatePath('/portal/documentos')
        revalidatePath('/portal/autorizaciones')
        revalidatePath('/portal/muro')
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
        .limit(1)
        .maybeSingle();

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

// An explicit authenticated preference change is recorded as such, never as a
// new drawn signature and never by copying an old signature onto new choices.
export async function saveImageConsentChoices(input: unknown) {
    try {
        const { supabase, user } = await requireUser()
        const parsed = z.object({ guardianId: z.string().uuid(), choices: z.array(playerConsentSchema).min(1).max(30), confirmed: z.literal(true) }).safeParse(input)
        if (!parsed.success) return { success: false, error: 'Confirma las opciones que quieres guardar.' }
        const { guardianId, choices } = parsed.data
        const { data: guardian } = await supabase.from('guardians').select('id').eq('id', guardianId).eq('user_id', user.id).maybeSingle()
        if (!guardian) return { success: false, error: 'No autorizado.' }
        const { data: signed } = await supabase.from('signatures').select('id').eq('guardian_id', guardianId).eq('document_type', GENERAL_DOCUMENT).limit(1).maybeSingle()
        if (!signed) return { success: false, error: 'Completa primero la firma de bienvenida.' }
        const { data: links, error } = await supabase.from('child_guardians').select('child_id').eq('guardian_id', guardianId)
        const ids = choices.map(c => c.childId)
        if (error || new Set(ids).size !== ids.length || ids.some(id => !links?.some(l => l.child_id === id))) return { success: false, error: 'Revisa los jugadores de la autorización.' }
        const h = await headers()
        const { error: saveError } = await supabase.from('signatures').insert(choices.map(c => ({
            guardian_id: guardianId, child_id: c.childId, document_type: IMAGE_DOCUMENT,
            document_version: CONSENT_VERSION, consent_options: c.options,
            signature_image_path: null, signature_data: JSON.stringify({ method: 'authenticated_choice', confirmed: true }),
            ip_address: h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
            user_agent: h.get('user-agent')?.slice(0, 500) || null,
        })))
        if (saveError) return { success: false, error: 'No se han guardado las opciones. Inténtalo de nuevo.' }
        revalidatePath('/portal', 'layout')
        return { success: true }
    } catch { return { success: false, error: 'No se han guardado las opciones. Revisa tu sesión.' } }
}
