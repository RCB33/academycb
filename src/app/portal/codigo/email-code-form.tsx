'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { KeyRound, Loader2, Mail } from 'lucide-react'
import { LanguageSwitcher, useLocale } from '@/lib/i18n/client'
import { createRecoveryClient } from '@/lib/supabase/recovery-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const messages = {
    es: {
        title: 'Tu acceso a Academy', codeStep: '1. Verifica tu email', passwordStep: '2. Crea tu contraseña',
        intro: 'Escribe el email de la inscripción y el código que has recibido. Después crearás tu contraseña personal.',
        email: 'Email de la inscripción', code: 'Código del correo', verify: 'Validar código y continuar',
        passwordIntro: 'Email verificado. Crea tu contraseña para entrar en tu portal. A partir de ahora accederás con tu email y esta contraseña.',
        password: 'Nueva contraseña', confirmation: 'Repite la contraseña', hint: 'Al menos 8 caracteres. Usa una contraseña que no utilices en otras webs.',
        save: 'Guardar contraseña y entrar', request: 'Enviar un nuevo código a este email', back: 'Volver al inicio de sesión',
        sending: 'Enviando…', checking: 'Comprobando…', saving: 'Guardando…',
        sent: 'Si este email tiene una cuenta, recibirá un código. Revisa también spam. Usa el último correo de recuperación que recibas.',
        emailRequired: 'Escribe un email válido para recibir el código.', mismatch: 'Las contraseñas no coinciden.',
        invalid_code: 'El código no es válido, ha caducado o ya se ha usado. Comprueba el email y el último código recibido, o solicita uno nuevo.',
        expired_setup: 'La verificación ha caducado. Solicita un nuevo código para continuar.',
        rate_limit: 'Has realizado varios intentos. Espera unos minutos antes de volver a intentarlo.',
        same_password: 'Elige una contraseña distinta de la anterior.', weak_password: 'Esta contraseña no es suficientemente segura. Prueba con otra más larga.',
        password_failed: 'No se ha podido guardar la contraseña. Comprueba los requisitos e inténtalo de nuevo.',
        unavailable: 'No se ha podido completar la operación. Inténtalo de nuevo en unos minutos.',
        invalid_request: 'Revisa el email, el código y las contraseñas. La contraseña debe tener entre 8 y 72 caracteres.',
    },
    ca: {
        title: 'El teu accés a Academy', codeStep: '1. Verifica el teu email', passwordStep: '2. Crea la teva contrasenya',
        intro: 'Escriu l’email de la inscripció i el codi que has rebut. Després crearàs la teva contrasenya personal.',
        email: 'Email de la inscripció', code: 'Codi del correu', verify: 'Validar el codi i continuar',
        passwordIntro: 'Email verificat. Crea la teva contrasenya per entrar al portal. A partir d’ara hi accediràs amb el teu email i aquesta contrasenya.',
        password: 'Nova contrasenya', confirmation: 'Repeteix la contrasenya', hint: 'Com a mínim 8 caràcters. Fes servir una contrasenya que no utilitzis en altres webs.',
        save: 'Desar la contrasenya i entrar', request: 'Enviar un nou codi a aquest email', back: 'Tornar a l’inici de sessió',
        sending: 'Enviant…', checking: 'Comprovant…', saving: 'Desant…',
        sent: 'Si aquest email té un compte, rebrà un codi. Revisa també el correu brossa. Fes servir l’últim correu de recuperació que rebis.',
        emailRequired: 'Escriu un email vàlid per rebre el codi.', mismatch: 'Les contrasenyes no coincideixen.',
        invalid_code: 'El codi no és vàlid, ha caducat o ja s’ha utilitzat. Comprova l’email i l’últim codi rebut, o demana’n un de nou.',
        expired_setup: 'La verificació ha caducat. Demana un nou codi per continuar.',
        rate_limit: 'Has fet diversos intents. Espera uns minuts abans de tornar-ho a provar.',
        same_password: 'Tria una contrasenya diferent de l’anterior.', weak_password: 'Aquesta contrasenya no és prou segura. Prova’n una de més llarga.',
        password_failed: 'No s’ha pogut desar la contrasenya. Comprova els requisits i torna-ho a provar.',
        unavailable: 'No s’ha pogut completar l’operació. Torna-ho a provar d’aquí a uns minuts.',
        invalid_request: 'Revisa l’email, el codi i les contrasenyes. La contrasenya ha de tenir entre 8 i 72 caràcters.',
    },
    en: {
        title: 'Your Academy access', codeStep: '1. Verify your email', passwordStep: '2. Create your password',
        intro: 'Enter the email used for registration and the code you received. Then create your personal password.',
        email: 'Registration email', code: 'Email code', verify: 'Verify code and continue',
        passwordIntro: 'Email verified. Create your password to enter your portal. From now on, use your email and this password to sign in.',
        password: 'New password', confirmation: 'Repeat your password', hint: 'At least 8 characters. Use a password you do not use on other websites.',
        save: 'Save password and sign in', request: 'Send a new code to this email', back: 'Back to sign in',
        sending: 'Sending…', checking: 'Checking…', saving: 'Saving…',
        sent: 'If this email has an account, it will receive a code. Check your spam folder too. Use the latest recovery email you receive.',
        emailRequired: 'Enter a valid email to receive the code.', mismatch: 'The passwords do not match.',
        invalid_code: 'The code is invalid, expired or already used. Check your email and the latest code, or request a new one.',
        expired_setup: 'Verification has expired. Request a new code to continue.',
        rate_limit: 'Too many attempts. Wait a few minutes before trying again.',
        same_password: 'Choose a password different from your previous one.', weak_password: 'This password is not strong enough. Try a longer one.',
        password_failed: 'Your password could not be saved. Check the requirements and try again.',
        unavailable: 'The operation could not be completed. Please try again in a few minutes.',
        invalid_request: 'Check your email, code and passwords. Your password must contain between 8 and 72 characters.',
    },
}

export function EmailCodeForm({ initialType, next }: { initialType: 'invite' | 'recovery'; next?: string }) {
    const t = messages[useLocale()]
    const [type, setType] = useState(initialType)
    const [step, setStep] = useState<'checking' | 'code' | 'password'>('checking')
    const [email, setEmail] = useState('')
    const [token, setToken] = useState('')
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [busy, setBusy] = useState(false)
    const inFlight = useRef(false)
    const [cooldown, setCooldown] = useState(0)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState(false)
    const passwordInput = useRef<HTMLInputElement>(null)
    const recovery = useMemo(() => createRecoveryClient(), [])

    useEffect(() => {
        let active = true
        fetch('/api/auth/email-code', { cache: 'no-store' }).then(r => r.json()).then(data => {
            if (!active) return
            setStep(data.step === 'password' ? 'password' : 'code')
            if (data.email) setEmail(data.email)
            else { try { const remembered = sessionStorage.getItem('academy-access-email'); if (remembered) setEmail(remembered) } catch {} }
        }).catch(() => { if (active) setStep('code') })
        return () => { active = false }
    }, [])
    useEffect(() => { if (step === 'password') passwordInput.current?.focus() }, [step])
    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setTimeout(() => setCooldown(value => value - 1), 1000)
        return () => clearTimeout(timer)
    }, [cooldown])

    async function submit(event: React.FormEvent) {
        event.preventDefault()
        if (inFlight.current) return
        if (step === 'password' && password !== confirmation) { setError(t.mismatch); return }
        inFlight.current = true; setBusy(true); setError('')
        try {
            const response = await fetch('/api/auth/email-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(step === 'code' ? { action: 'verify', email, token, type } : { action: 'password', password, confirmation, next }) })
            const result = await response.json()
            if (!response.ok) {
                setError(t[result.error as keyof typeof t] || t.unavailable)
                if (result.error === 'expired_setup') { setStep('code'); setToken(''); setPassword(''); setConfirmation('') }
                return
            }
            if (result.step === 'password') { setStep('password'); setEmail(result.email); setToken(''); setNotice(false) }
            if (result.success) { try { sessionStorage.removeItem('academy-access-email') } catch {}; window.location.assign(result.next) }
        } catch { setError(t.unavailable) }
        finally { inFlight.current = false; setBusy(false) }
    }

    async function sendCode() {
        if (inFlight.current || cooldown > 0) return
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(t.emailRequired); return }
        inFlight.current = true; setBusy(true); setError(''); setNotice(false)
        try {
            const { error } = await recovery.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/portal/codigo?type=recovery` })
            if (error) { setError(error.status === 429 ? t.rate_limit : t.unavailable); return }
            setType('recovery'); setToken(''); setNotice(true); setCooldown(60)
            // Keep the flow correct when a parent reloads or opens the newest email.
            const url = new URL(window.location.href); url.searchParams.set('type', 'recovery'); window.history.replaceState({}, '', url)
        } catch { setError(t.unavailable) }
        finally { inFlight.current = false; setBusy(false) }
    }

    return <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-10">
        <div className="w-full max-w-md">
            <div className="mb-5 flex justify-end"><LanguageSwitcher /></div>
            <section className="rounded-3xl border border-white/15 bg-white p-6 shadow-2xl sm:p-8" aria-labelledby="code-access-title">
                <KeyRound aria-hidden="true" className="mb-4 h-9 w-9 text-gold" />
                <h1 id="code-access-title" className="font-heading text-3xl font-black text-navy">{t.title}</h1>
                {step === 'checking' ? <p className="mt-6 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />{t.checking}</p> : <>
                    <p className="mt-5 text-sm font-bold text-navy">{step === 'code' ? t.codeStep : t.passwordStep}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{step === 'code' ? t.intro : t.passwordIntro}</p>
                    <form className="mt-6 space-y-4" onSubmit={submit}>
                        {step === 'code' ? <>
                            <div className="space-y-2"><Label htmlFor="code-email">{t.email}</Label><Input id="code-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} disabled={busy} /></div>
                            <div className="space-y-2"><Label htmlFor="email-code">{t.code}</Label><Input id="email-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} value={token} onChange={e => setToken(e.target.value.replace(/\D/g, ''))} required disabled={busy} className="h-14 text-center text-2xl tracking-[.25em]" /></div>
                        </> : <>
                            <p className="flex items-center gap-2 break-all text-sm text-slate-600"><Mail className="h-4 w-4 shrink-0" />{email}</p>
                            <div className="space-y-2"><Label htmlFor="new-password">{t.password}</Label><Input ref={passwordInput} id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} aria-describedby="password-hint" /><p id="password-hint" className="text-xs leading-relaxed text-slate-500">{t.hint}</p></div>
                            <div className="space-y-2"><Label htmlFor="confirm-password">{t.confirmation}</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} required disabled={busy} /></div>
                        </>}
                        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                        {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{t.sent}</p>}
                        <Button disabled={busy} className="min-h-12 h-auto w-full whitespace-normal bg-gold py-3 font-bold text-navy hover:bg-gold/90">{busy && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />}{busy ? (step === 'password' ? t.saving : t.checking) : step === 'code' ? t.verify : t.save}</Button>
                        {step === 'code' && <Button type="button" variant="outline" disabled={busy || cooldown > 0} onClick={sendCode} className="min-h-12 h-auto w-full whitespace-normal py-3 text-navy">{t.request}{cooldown > 0 ? ` (${cooldown}s)` : ''}</Button>}
                    </form>
                </>}
                <Link href="/portal" className="mt-6 block text-center text-sm font-semibold text-navy underline">{t.back}</Link>
            </section>
        </div>
    </main>
}
