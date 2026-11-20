import { redirect } from 'next/navigation'
import { getFamilyContext } from '@/lib/family-context'
import { getFamilyMedia } from '@/app/actions/family-media'
import { FamilyGallery } from '@/components/portal/family-gallery'
export const dynamic='force-dynamic'
export default async function FamilyGalleryPage({searchParams}:{searchParams:Promise<{child?:string}>}) {
    const family=await getFamilyContext(true)
    if(!family)redirect('/portal')
    const selected=(await searchParams).child
    const child=family.children.some(c=>c.id===selected)?selected:undefined
    return <div className="mx-auto max-w-6xl"><FamilyGallery initialItems={await getFamilyMedia(true)} players={family.children} initialChild={child}/></div>
}
