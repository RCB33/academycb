import { NextResponse } from 'next/server'
import { getCommunityComments } from '@/app/actions/community-social'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const rawOffset = new URL(request.url).searchParams.get('offset') || '0'
    const result = await getCommunityComments(id, /^\d+$/.test(rawOffset) ? Number(rawOffset) : -1)
    return NextResponse.json(result, { status: result.success ? 200 : 400, headers: { 'Cache-Control': 'private, no-store' } })
}
