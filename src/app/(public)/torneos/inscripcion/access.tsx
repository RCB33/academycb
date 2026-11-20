'use client'
import { useT } from '@/lib/i18n/client'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FormDraft, useDraftState, useFormDraft } from '@/components/forms/form-draft'

export function EventAccess({ initialTournament }: { initialTournament?: string }) {
  return <FormDraft storageKey="academy:draft:tournament-access"><AccessFields initialTournament={initialTournament} /></FormDraft>
}
function AccessFields({ initialTournament }: { initialTournament?: string }) {
  const translate = useT()
  const [mode, setMode] = useDraftState<'existing'|'new'>('mode', 'new')
  const [email, setEmail] = useDraftState<string>('email', '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const draft = useFormDraft()
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  async function access(link: boolean) {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      if (!email.trim()) throw new Error('Escribe tu correo electrónico.')
      const next = `/torneos/inscripcion${initialTournament ? `?torneo=${encodeURIComponent(initialTournament)}` : ''}`
      const { error } = link ? await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: mode === 'new', emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } }) : await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new Error(link ? 'No se pudo enviar el enlace. Comprueba el correo e inténtalo más tarde.' : 'Correo o contraseña incorrectos.')
      if (link) setMessage('Si el correo puede acceder, recibirás un enlace. Ábrelo en este mismo navegador para verificar tu cuenta y continuar. Revisa también la carpeta de spam.')
      else { draft.clear(); router.refresh() }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo acceder.') } finally { setBusy(false) }
  }
  return <section className="mx-auto mt-8 max-w-2xl rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
    <h2 className="text-2xl font-black">{translate('Juega los torneos con Academy')}</h2>
    <p className="mt-3 text-sm leading-relaxed text-slate-600">{translate('Para jugadores de Academy y de otros clubes, también sin equipo. No necesitas estar matriculado en la academia: solicita tu plaza y nosotros organizamos los equipos.')}</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {(['new','existing'] as const).map(m => <button type="button" key={m} aria-pressed={mode === m} disabled={busy} onClick={() => {setMode(m);setMessage('');setPassword('')}} className={`min-h-24 rounded-xl border p-4 text-left transition ${mode === m ? 'border-gold bg-navy text-white ring-2 ring-gold/40' : 'border-slate-200 text-navy hover:border-gold'}`}>
        <span className={`block text-base font-bold ${mode === m ? 'text-gold' : ''}`}>{translate(m === 'new' ? 'Soy nuevo / vengo de otro club' : 'Ya tengo cuenta Academy')}</span>
        <span className="mt-2 block text-sm">{translate(m === 'new' ? 'Inscribir a mi hijo solo en torneos.' : 'Entrar y utilizar la ficha de mi hijo.')}</span>
      </button>)}
    </div>
    <form className="mt-6 space-y-4" onSubmit={e => { e.preventDefault(); void access(mode === 'new') }}>
      <label className="block text-sm font-semibold">{translate('Correo del padre, madre o tutor')}<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 block min-h-12 w-full rounded-lg border p-3 text-base" /></label>
      {mode === 'existing' && <label className="block text-sm font-semibold">{translate('Contraseña')}<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 block min-h-12 w-full rounded-lg border p-3 text-base" /></label>}
      {mode === 'new' && <p className="text-sm leading-relaxed text-slate-600">{translate('Primero verifica tu correo. Después podrás añadir al jugador, elegir los torneos y enviar la solicitud. Crear esta cuenta no te matricula en Academia ni genera ningún cobro.')}</p>}
      <button disabled={busy} className="min-h-12 w-full rounded-xl bg-gold p-3 font-bold disabled:opacity-50">{translate(busy ? 'Un momento…' : mode === 'new' ? 'Verificar correo y apuntarme a torneos' : 'Entrar e inscribir')}</button>
    </form>
    {mode === 'existing' && <button disabled={busy} onClick={() => void access(true)} className="mt-4 min-h-11 text-sm underline">{translate('Acceder con un enlace por correo, sin contraseña')}</button>}
    {message && <p role="status" className="mt-4 rounded-xl bg-slate-100 p-4 text-sm">{translate(message)}</p>}
  </section>
}
