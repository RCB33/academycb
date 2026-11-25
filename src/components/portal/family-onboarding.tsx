import Link from 'next/link'
import { ArrowRight, CheckCircle2, ClipboardList, MessageCircle } from 'lucide-react'
import type { Locale } from '@/lib/i18n/translate'
import type { FamilyOnboardingState } from '@/lib/family-onboarding'

export function FamilyOnboarding({ state, locale }: { state: FamilyOnboardingState; locale: Locale }) {
    const t = (es: string, ca: string, en: string) => ({ es, ca, en })[locale]
    const start = state === 'start', pending = state === 'pending', verify = state === 'verify'
    const title = start
        ? t('Completa tu inscripción', 'Completa la teva inscripció', 'Complete your registration')
        : pending ? t('Solicitud recibida', 'Sol·licitud rebuda', 'Application received')
        : verify ? t('Verifica tu correo para continuar', 'Verifica el correu per continuar', 'Verify your email to continue')
        : t('Revisemos tu ficha familiar', 'Revisem la teva fitxa familiar', 'Let’s review your family profile')
    const description = start
        ? t('Tu cuenta ya está creada y tu correo está verificado. Ahora añade los datos de tu hijo o hija, elige la actividad y envía la solicitud.', 'El teu compte ja està creat i el correu està verificat. Ara afegeix les dades del teu fill o filla, tria l’activitat i envia la sol·licitud.', 'Your account is created and your email is verified. Now add your child’s details, choose an activity and submit your application.')
        : pending ? t('Ya tenemos tu solicitud. Academy revisará la plaza y te comunicará los siguientes pasos. No necesitas enviar otra inscripción.', 'Ja tenim la teva sol·licitud. Academy revisarà la plaça i et comunicarà els passos següents. No cal enviar una altra inscripció.', 'We have your application. Academy will review your place and tell you the next steps. You do not need to apply again.')
        : verify ? t('Confirma tu correo antes de continuar con la inscripción.', 'Confirma el correu abans de continuar amb la inscripció.', 'Confirm your email before continuing with registration.')
        : t('Encontramos una inscripción anterior, pero no hay un jugador activo vinculado a tu acceso. Contacta con Academy para revisar la ficha antes de enviar otra solicitud.', 'Hem trobat una inscripció anterior, però no hi ha cap jugador actiu vinculat al teu accés. Contacta amb Academy per revisar la fitxa abans d’enviar una altra sol·licitud.', 'We found an earlier application, but no active player is linked to your account. Contact Academy to review the profile before applying again.')
    return <section className="mx-auto max-w-xl rounded-3xl border border-gold/25 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="family-onboarding-title">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-navy"><ClipboardList aria-hidden="true" className="h-6 w-6" /></div>
        {!verify && <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />{t('Correo verificado', 'Correu verificat', 'Email verified')}</p>}
        <h1 id="family-onboarding-title" className="mt-3 text-3xl font-black tracking-tight text-navy">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">{description}</p>
        {(start || verify) && <Link href={verify ? '/inscripcion?access=1' : '/inscripcion'} className="mt-7 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-center font-bold text-navy">{verify ? t('Verificar correo', 'Verificar correu', 'Verify email') : t('Continuar inscripción', 'Continuar la inscripció', 'Continue registration')}<ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0" /></Link>}
        {start && <p className="mt-3 text-sm text-slate-500">{t('Si ya inscribiste a tu hijo con otro correo, contacta con Academy para vincularlo. No hace falta crear otra cuenta.', 'Si ja vas inscriure el teu fill amb un altre correu, contacta amb Academy per vincular-lo. No cal crear un altre compte.', 'If you already registered your child with another email, contact Academy to link the profile. You do not need another account.')}</p>}
        <a href="https://wa.me/34691179600" target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-center font-semibold text-navy"><MessageCircle aria-hidden="true" className="h-5 w-5 shrink-0" />{t('Contactar con Academy', 'Contactar amb Academy', 'Contact Academy')}</a>
    </section>
}
