import { adminReadAll } from '@/lib/admin-read-all'
import { requireAdmin } from '@/lib/auth'
import { ActivityNavigation } from '@/components/admin/activity-navigation'
import { CampusRequests } from './requests'

export default async function CampusRequestsPage() {
 const {supabase}=await requireAdmin()
 const [requests,links,campuses]=await Promise.all([
    adminReadAll((from,to)=>supabase.from('enrollment_requests').select('*').eq('service','campus').order('created_at',{ascending:false}).order('id').range(from,to)),
    adminReadAll((from,to)=>supabase.from('campus_request_links').select('request_id,enrollment_id,created_at').order('request_id').range(from,to)),
    adminReadAll((from,to)=>supabase.from('campuses').select('id,name,price,status').eq('status','published').order('id').range(from,to)),
 ])
 if(requests.error || links.error)throw new Error('No se pudieron cargar las solicitudes de campus.')
 return <main className="space-y-6 p-4 md:p-8"><ActivityNavigation/><div><h1 className="text-3xl font-black">Solicitudes de campus</h1><p className="mt-3 text-slate-600">Aquí llegan los formularios de la web. Contacta con la familia, revisa sus datos y acepta la solicitud para crear la inscripción del campus. Aceptar no significa que esté pagado.</p></div><CampusRequests campuses={campuses.data} requests={requests.data.map(r=>({...r,accepted:links.data.some(l=>l.request_id===r.id)}))}/></main>
}
