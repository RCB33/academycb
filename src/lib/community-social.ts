export type WallEngagement = { likes: number; liked: boolean; comments: number }
export type WallComment = { id: string; body: string; author_name: string; created_at: string; isOwn: boolean }
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
export function wallPostPath(id: string) {
    if (!new RegExp(`^${uuid}$`, 'i').test(id)) throw Error('Publicación no válida')
    return `/portal/muro/publicacion/${id}`
}
export function wallReturnPath(value: string | null) {
    return value && new RegExp(`^/portal/muro/publicacion/${uuid}$`, 'i').test(value) ? value : null
}
