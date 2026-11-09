'use client'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function EventAccess() {
  const [mode, setMode] = useState<'existing'|'new'>('existing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  async function access(link: boolean) {
    setBusy(true); setMessage('')
    try {
      if (!email.trim()) throw new Error('Escribe tu correo electrónico.')
      const { error } = link ? await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: mode === 'new', emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/torneos/inscripcion')}` } }) : await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new Error(link ? 'No se pudo enviar el enlace. Comprueba el correo e inténtalo más tarde.' : 'Correo o contraseña incorrectos.')
      if (link) setMessage('Si el correo puede acceder, recibirás un enlace. Ábrelo en este mismo navegador para verificar tu cuenta y continuar. Revisa también la carpeta de spam.')
      else router.refresh()
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo acceder.') } finally { setBusy(false) }
  }
  return <section className="mx-auto mt-8 max-w-xl rounded-3xl border bg-white p-6 shadow-sm"><div className="grid grid-cols-2 gap-3">{(['existing','new'] as const).map(m => <button key={m} onClick={() => {setMode(m);setMessage('')}} className={`rounded-xl border p-3 font-bold ${mode === m ? 'bg-navy text-white' : ''}`}>{m === 'existing' ? 'Ya tengo cuenta' : 'No tengo cuenta'}</button>)}</div>
    <form className="mt-6 space-y-4" onSubmit={e => { e.preventDefault(); void access(mode === 'new') }}>
      <label className="block text-sm font-semibold">Correo del padre, madre o tutor<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 block w-full rounded-lg border p-3" /></label>
      {mode === 'existing' && <label className="block text-sm font-semibold">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 block w-full rounded-lg border p-3" /></label>}
      {mode === 'new' && <p className="text-sm text-slate-600">Verificaremos tu correo antes de mostrar o enlazar fichas. Si ya lo has utilizado con Academy, usa ese mismo correo. Crear la cuenta no implica matricularse en la academia.</p>}
      <button disabled={busy} className="w-full rounded-xl bg-gold p-3 font-bold disabled:opacity-50">{busy ? 'Un momento…' : mode === 'new' ? 'Verificar correo y continuar' : 'Entrar e inscribir'}</button>
    </form>
    {mode === 'existing' && <button disabled={busy} onClick={() => void access(true)} className="mt-4 text-sm underline">Acceder con un enlace por correo, sin contraseña</button>}
    {message && <p role="status" className="mt-4 rounded-xl bg-slate-100 p-4 text-sm">{message}</p>}
  </section>
}
