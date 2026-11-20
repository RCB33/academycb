import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { VIEW_COOKIE } from '@/lib/admin-view'
import { z } from 'zod'

export async function POST(request: Request) {
    const origin = request.headers.get('origin')
    const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.slice(0,-1)
    if (!origin || origin !== `${protocol}://${request.headers.get('host')}`) return new NextResponse('Origen no permitido', {status:403})
    try {
        const { supabase } = await requireAdmin()
        const form = await request.formData()
        const kind = z.enum(['parents','coach']).parse(form.get('kind'))
        const id = z.string().uuid().parse(form.get('id'))
        const query = kind === 'parents' ? supabase.from('guardians').select('id').eq('id',id).not('user_id','is',null) : supabase.from('workers').select('id').eq('id',id).eq('access_enabled',true)
        const { data } = await query.maybeSingle()
        if (!data) return new NextResponse('Vista no disponible', {status:404})
        const response = NextResponse.redirect(new URL(kind === 'parents' ? '/portal/dashboard' : '/coach',origin),303)
        response.cookies.set(VIEW_COOKIE[kind],id,{httpOnly:true,secure:new URL(origin).protocol==='https:',sameSite:'lax',path:'/',maxAge:60*60*8})
        return response
    } catch { return new NextResponse('No se pudo cambiar la vista', {status:403}) }
}
