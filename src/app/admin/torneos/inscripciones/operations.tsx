'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveTournamentOperations } from '@/app/actions/activity-management'
import { christmasTournaments } from '@/lib/christmas-tournaments'

export type TournamentOperationsData = { teams: Record<string,string>; internal_note: string; contacted_at: string | null; kit_status: string; documents_checked: boolean; updated_at: string }
export type TournamentHistory = { id: string; action: string; note: string | null; created_at: string }
const field = 'mt-1 block w-full rounded-lg border bg-white p-2 font-normal'
export function TournamentOperations({ id, tournaments, phone, club, coach, operations, history }: { id: string; tournaments: string[]; phone: string; club: string; coach: string; operations?: TournamentOperationsData; history: TournamentHistory[] }) {
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const router = useRouter()
  return <details className="mt-5 rounded-xl border bg-slate-50 p-4"><summary className="cursor-pointer font-bold">Gestión interna · equipos, contacto y equipación</summary>
    <p className="mt-3 text-xs text-slate-600">Equipos, notas y seguimiento solo son visibles para administradores. El teléfono, club y entrenador corregidos sí se actualizan en la inscripción. No se modifican consentimientos ni importes.</p>
    <form className="mt-4 space-y-4" onSubmit={async e => {e.preventDefault();setBusy(true);try {const result=await saveTournamentOperations(new FormData(e.currentTarget));setMessage(result.error || 'Seguimiento guardado.');if(!result.error)router.refresh()} catch {setMessage('No se pudo guardar. Inténtalo de nuevo.')} finally {setBusy(false)}}}>
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-3">{[['phone','Teléfono',phone],['club','Club',club],['coach','Entrenador',coach]].map(([name,label,value]) => <label key={name} className="text-sm font-semibold">{label}<input name={name} defaultValue={value || ''} maxLength={name==='phone'?20:120} required={name==='phone'} className={field}/></label>)}</div>
      <div className="grid gap-3 sm:grid-cols-3">{christmasTournaments.filter(t=>tournaments.includes(t.id)).map(t=><label key={t.id} className="text-sm font-semibold">Equipo · {t.name}<input name={`team_${t.id}`} defaultValue={operations?.teams[t.id] || ''} placeholder="Ej. Academy S10 A" maxLength={100} className={field}/></label>)}</div>
      <label className="block text-sm font-semibold">Seguimiento de equipación<select name="kit_status" defaultValue={operations?.kit_status || 'pending'} className={field}>{Object.entries({pending:'Pendiente de revisar',ordered:'Pedida',ready:'Preparada',delivered:'Entregada',not_needed:'No necesita'}).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="flex gap-2 text-sm"><input name="documents_checked" type="checkbox" defaultChecked={operations?.documents_checked}/>He revisado la documentación necesaria para los torneos seleccionados</label>
      <label className="flex gap-2 text-sm"><input name="contacted" type="checkbox"/>Registrar contacto con la familia ahora (no envía ningún mensaje)</label>
      {operations?.contacted_at && <p className="text-xs text-slate-500">Último contacto registrado: {new Date(operations.contacted_at).toLocaleString('es-ES')}</p>}
      <label className="block text-sm font-semibold">Notas internas<textarea name="internal_note" defaultValue={operations?.internal_note || ''} maxLength={3000} rows={3} className={field}/></label>
      <button disabled={busy} className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?'Guardando…':'Guardar seguimiento'}</button>{message && <p role="status" className="text-sm">{message}</p>}
    </form>
    <h4 className="mt-6 font-bold">Historial de la inscripción</h4><ol className="mt-3 space-y-3">{history.map(h=><li key={h.id} className="border-l-2 border-gold pl-3 text-sm"><p className="font-semibold">{({submitted:'Solicitud recibida',approve:'Selección aprobada',confirm:'Ingreso confirmado',reject_proof:'Corrección solicitada',cancel:'Solicitud anulada',file_uploaded:'Documento adjuntado',operations_updated:'Seguimiento actualizado'} as Record<string,string>)[h.action] || h.action}</p><p className="text-xs text-slate-500">{new Date(h.created_at).toLocaleString('es-ES')}</p>{h.note && <p className="mt-1 break-words">{h.note}</p>}</li>)}{!history.length && <li className="text-sm text-slate-500">Todavía no hay movimientos.</li>}</ol>
  </details>
}
