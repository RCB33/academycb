'use client'
import { useState } from 'react'
import { saveEventBankHolder } from '@/app/actions/event-registrations'
import { useRouter } from 'next/navigation'
export function EventBankSettings({ holder }: { holder: string | null }) {
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const router=useRouter()
 return <form className="rounded-xl border border-amber-300 bg-amber-50 p-5" onSubmit={async e=>{e.preventDefault();setBusy(true);const result=await saveEventBankHolder(new FormData(e.currentTarget));setBusy(false);setMessage(result.error||'Titular guardado.');if(!result.error)router.refresh()}}><h2 className="font-bold">Cuenta de transferencias de Academy</h2><p className="my-2 break-all font-mono text-sm">ES06 2100 6176 9202 0007 2768</p><p className="mb-3 text-sm">Antes de habilitar pagos, confirma el nombre exacto del titular según el banco. No uses el titular o la cuenta de un organizador externo.</p><label className="block text-sm">Titular<input name="bank_holder" required minLength={3} maxLength={150} defaultValue={holder||''} className="mt-1 block w-full rounded-lg border bg-white p-3" /></label><button disabled={busy} className="mt-3 rounded-lg bg-navy px-4 py-2 text-white">Guardar titular</button>{message&&<p role="status" className="mt-2 text-sm">{message}</p>}</form>
}
