import CommunityWallPage from '@/components/portal/community-wall-feed'
export const dynamic = 'force-dynamic'
export default async function Page({params}:{params:Promise<{id:string}>}) { const {id}=await params; return <CommunityWallPage postId={id}/> }
