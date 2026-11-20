import 'server-only'
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'
import { z } from 'zod'

export const setupCookie = 'academy-password-setup'
export const setupLifetime = 10 * 60
const pendingSchema = z.object({
    access_token: z.string().min(1).max(6000),
    refresh_token: z.string().min(1).max(512),
    userId: z.string().uuid(),
    email: z.string().email(),
    expiresAt: z.number(),
})
export type PendingPasswordSetup = z.infer<typeof pendingSchema>

function key() {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) throw new Error('Password setup unavailable')
    return Buffer.from(hkdfSync('sha256', secret, 'academy-auth', 'password-setup-v1', 32))
}

// This cookie is not an application session. Keep the verified tokens encrypted
// and HttpOnly until the owner has successfully chosen a password.
export function sealPasswordSetup(value: PendingPasswordSetup) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key(), iv)
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(pendingSchema.parse(value)), 'utf8'), cipher.final()])
    const result = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url')
    if (result.length > 3800) throw new Error('Password setup too large')
    return result
}

export function openPasswordSetup(value?: string): PendingPasswordSetup | null {
    if (!value || value.length > 3800) return null
    try {
        const bytes = Buffer.from(value, 'base64url')
        const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12))
        decipher.setAuthTag(bytes.subarray(12, 28))
        const plain = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')
        const parsed = pendingSchema.parse(JSON.parse(plain))
        if (parsed.expiresAt <= Date.now() || parsed.expiresAt > Date.now() + setupLifetime * 1000) return null
        return parsed
    } catch { return null }
}
