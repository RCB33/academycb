'use client'
import { useState } from 'react'
import { eventFiles, uploadEventFile } from '@/app/actions/event-registrations'
import { useRouter } from 'next/navigation'

export function EventRegistrationFiles({ id, status, admin = false }: { id: string; status: string; admin?: boolean }) {
  const [files, setFiles] = useState<Awaited<ReturnType<typeof eventFiles>>>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function load() { try { setFiles(await eventFiles(id)); setMessage('Documentos actualizados. Los enlaces caducan a los dos minutos; pulsa de nuevo para renovarlos.') } catch (e) { setMessage(e instanceof Error ? e.message : 'Error al consultar documentos.') } }
  return <div className="mt-4 space-y-3 border-t pt-4">
    {!admin && status !== 'cancelled' && <form className="flex flex-wrap items-end gap-3" onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; setBusy(true); const result = await uploadEventFile(new FormData(form)); setMessage(result.error || 'Archivo recibido. El justificante requiere revisión; no confirma el pago automáticamente.'); setBusy(false); if (!result.error) {form.reset(); await load(); router.refresh()} }}>
      <input type="hidden" name="registration" value={id} />
      <label className="text-sm">Tipo de documento<select name="kind" className="mt-1 block max-w-full rounded-lg border bg-white p-2">{status === 'awaiting_payment' && <option value="proof">Justificante de transferencia</option>}<option value="federation">Ficha federativa</option><option value="identity">DNI (si se solicita)</option><option value="health">Tarjeta sanitaria (si se solicita)</option></select></label>
      <label className="min-w-0 text-sm">PDF, JPG o PNG · máximo 3 MB<input type="file" name="file" required accept="application/pdf,image/jpeg,image/png" className="mt-1 block max-w-full text-sm" /></label><button disabled={busy} className="rounded-lg bg-navy px-4 py-2 text-white disabled:opacity-50">{busy ? 'Subiendo…' : 'Adjuntar'}</button>
    </form>}
    {!admin && <p className="text-xs text-slate-500">Sube únicamente los documentos solicitados por Academy. Acceso privado para tu familia y administración.</p>}
    <button onClick={() => void load()} className="text-sm font-semibold underline">Ver documentos adjuntos</button>
    {files.map(f => <p key={f.id} className="break-words text-sm">{f.kind === 'proof' ? 'Justificante' : f.kind === 'federation' ? 'Ficha federativa' : f.kind === 'identity' ? 'Identidad' : 'Tarjeta sanitaria'}: {f.url ? <a className="underline" href={f.url} target="_blank" rel="noopener noreferrer">{f.filename}</a> : 'No se pudo generar el enlace'}</p>)}
    {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
  </div>
}
