export const GENERAL_DOCUMENT = 'Condiciones Generales Academia'
export const IMAGE_DOCUMENT = 'Autorización de imagen y vídeo'
export const CONSENT_VERSION = '2026.11'
export type ImageConsentOptions = { portal_internal: boolean; public_communications: boolean }
export type ConsentPlayer = { id: string; fullName: string; options: ImageConsentOptions }
export const NO_IMAGE_CONSENT: ImageConsentOptions = { portal_internal: false, public_communications: false }
