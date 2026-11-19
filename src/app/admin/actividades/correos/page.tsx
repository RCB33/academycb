import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { deliverRegistrationEmail } from '@/lib/registration-email'
import { ActivityNavigation } from '@/components/admin/activity-navigation'

async function retry(form: FormData) {
  'use server'
  await requireAdmin()
  await deliverRegistrationEmail(z.string().uuid().parse(form.get('id')))
  revalidatePath('/admin/actividades/correos')
}

// Request-time server value; the database independently enforces this window.
async function retryCutoff() { return Date.now()-23*60*60*1000 }

export default async function RegistrationEmailsPage() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('registration_email_outbox').select('id,source_type,event_kind,recipient,status,attempts,last_error,created_at,first_attempted_at').order('created_at', { ascending: false }).limit(200)
  if (error) throw new Error('No se pudo consultar el registro de correos.')
  const cutoff = await retryCutoff()
  const labels: Record<string,string> = {pending:'Pendiente',sending:'En proceso',sent:'Aceptado por el proveedor',failed:'No enviado'}
  const events: Record<string,string> = {received:'Solicitud recibida',reviewed:'Solicitud tramitada',awaiting_payment:'Solicitud validada',confirmed:'Inscripción confirmada',cancelled:'Inscripción anulada'}
  return <main className="space-y-6 p-4 md:p-8">
    <ActivityNavigation/><h1 className="text-3xl font-black">Correos de inscripciones</h1>
    <p className="text-slate-600">Últimos 200 avisos. Puedes reintentar los pendientes o fallidos: espera 5 minutos entre intentos, máximo 5 intentos y 3 avisos por dirección y hora. La aceptación del proveedor no garantiza la llegada a la bandeja de entrada.</p>
    <p className="text-sm">Tras 23 horas desde el primer intento, revisa el envío en Resend antes de contactar manualmente con la familia: el reenvío automático queda bloqueado para evitar duplicados. No se han reenviado solicitudes históricas. Los correos no incluyen documentación ni datos de salud.</p>
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm">
      <thead><tr>{['Fecha','Destinatario','Aviso','Estado','Intentos','Acción'].map(x=><th className="p-3" key={x}>{x}</th>)}</tr></thead>
      <tbody>{data?.map(row=>{
        const expired=row.first_attempted_at && new Date(row.first_attempted_at).getTime()<cutoff
        return <tr className="border-t" key={row.id}>
          <td className="p-3">{new Date(row.created_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}</td>
          <td className="p-3">{row.recipient}</td><td className="p-3">{row.source_type==='event'?'Torneos':row.source_type==='membership'?'Alta manual de Academia':'Academia / campus'} · {events[row.event_kind]||row.event_kind}</td>
          <td className="p-3">{labels[row.status]}{row.last_error&&<small className="block text-red-700">{row.last_error}</small>}</td><td className="p-3">{row.attempts}</td>
          <td className="p-3">{row.status!=='sent'&&(row.attempts>=5||expired?<span>Revisión manual en Resend</span>:<form action={retry}><input type="hidden" name="id" value={row.id}/><button className="rounded bg-navy px-3 py-2 text-white">Intentar envío</button></form>)}</td>
        </tr>
      })}</tbody>
    </table>{!data?.length&&<p className="p-6">Todavía no hay avisos registrados.</p>}</div>
  </main>
}
