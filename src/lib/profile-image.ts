/** Keep stored URLs stable while serving private profile photos through authorization. */
export function profileImageUrl(value?: string | null): string | undefined {
    if (!value) return undefined
    const marker = '/storage/v1/object/public/profile_images/'
    if (!value.includes(marker)) return value
    return `/api/profile-image?path=${encodeURIComponent(value.split(marker)[1])}`
}
