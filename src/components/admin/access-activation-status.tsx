import { Check, Clock3, KeyRound, LogIn, MailCheck, UserCheck } from 'lucide-react'
import type { AccessActivationStatus as Status } from '@/lib/auth/access-activation'

const EMPTY_STATUS: Status = {
    accountCreated: false,
    invitationSent: false,
    emailConfirmed: false,
    passwordCreated: false,
    firstAccessCompleted: false,
    invitedAt: null,
    completedAt: null,
}

export function AccessActivationStatus({ status, compact = false }: { status?: Status | null, compact?: boolean }) {
    const current = status || EMPTY_STATUS
    const completed = current.firstAccessCompleted
    const steps = [
        { label: 'Cuenta creada', done: current.accountCreated, icon: UserCheck },
        { label: 'Invitación enviada', done: current.invitationSent, icon: MailCheck },
        { label: 'Email confirmado', done: current.emailConfirmed, icon: Check },
        { label: 'Contraseña creada', done: current.passwordCreated, icon: KeyRound },
        { label: 'Primer acceso completado', done: current.firstAccessCompleted, icon: LogIn },
    ]

    if (compact) {
        const doneCount = steps.filter((step) => step.done).length
        return (
            <div className="min-w-[190px]">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${completed ? 'bg-emerald-100 text-emerald-700' : current.invitationSent ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                    {completed ? <Check className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                    {completed ? 'Acceso completado' : current.invitationSent ? 'Activación pendiente' : 'Sin invitación'}
                </div>
                <div className="mt-2 flex gap-1" aria-label={`${doneCount} de ${steps.length} pasos completados`}>
                    {steps.map((step) => <span key={step.label} title={`${step.label}: ${step.done ? 'completado' : 'pendiente'}`} className={`h-1.5 flex-1 rounded-full ${step.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />)}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">{doneCount}/{steps.length} comprobaciones</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Activación de cuenta</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                    {completed ? 'Completada' : 'Pendiente'}
                </span>
            </div>
            <div className="grid gap-1.5">
                {steps.map(({ label, done, icon: Icon }) => (
                    <div key={label} className={`flex items-center gap-2 text-xs ${done ? 'font-semibold text-emerald-700' : 'text-slate-400'}`}>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${done ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                            {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                        </span>
                        {label}
                    </div>
                ))}
            </div>
        </div>
    )
}
