export const FAMILY_VIDEO_LIMIT = 20 * 1024 * 1024
export const FAMILY_VIDEO_TYPES: Record<string,string> = {'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'}
export type FamilyMediaItem = {id:string;title:string;description:string|null;type:'image'|'video';url:string;createdAt:string;childIds:string[];audience:string;source:'family'|'academy';canDelete:boolean;childId:string|null}
export function videoFileIsValid(bytes: Uint8Array, mime: string) {
    if (bytes.length<12) return false
    if(mime==='video/webm') return bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3
    return ['video/mp4','video/quicktime'].includes(mime) && String.fromCharCode(...bytes.slice(4,8))==='ftyp'
}
export function youtubeEmbed(value:string) {
    try { const url=new URL(value); const id=url.hostname==='youtu.be'?url.pathname.slice(1):['www.youtube.com','youtube.com','m.youtube.com'].includes(url.hostname)?(url.searchParams.get('v')||url.pathname.split('/').filter(Boolean)[1]):null
        return id&&/^[\w-]{11}$/.test(id)?`https://www.youtube-nocookie.com/embed/${id}`:null
    }catch{return null}
}
