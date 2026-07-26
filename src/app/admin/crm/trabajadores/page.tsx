import { getWorkerAccessAudit, getWorkers } from "@/app/actions/workers"
import { WorkerDialog } from "./components/worker-dialog"
import { History, Plus, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkerCard } from "./components/worker-card"

const AUDIT_LABELS: Record<string, string> = {
    invited: 'Invitación enviada',
    reactivated: 'Acceso reactivado',
    updated: 'Cuenta o rol actualizado',
    revoked: 'Acceso revocado',
    email_resent: 'Correo de acceso reenviado',
    deleted: 'Trabajador y cuenta eliminados',
    auth_cleanup_failed: 'Limpieza técnica pendiente',
}

export default async function WorkersPage() {
    const [workers, accessAudit] = await Promise.all([
        getWorkers(),
        getWorkerAccessAudit(),
    ])
    const workerNames = new Map(workers.map((worker) => [worker.id, worker.full_name]))

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Equipo Técnico</h1>
                    <p className="text-muted-foreground">
                        Gestiona los entrenadores, fisios y directivos de la academia.
                    </p>
                </div>
                <WorkerDialog mode="create" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {workers?.map((worker) => (
                    <WorkerCard key={worker.id} worker={worker} />
                ))}

                {/* Empty State / Add Card */}
                <div className="relative min-h-[250px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-yellow-500 hover:text-yellow-600 transition-colors cursor-pointer group">
                    <div className="mb-4 p-4 rounded-full bg-slate-50 group-hover:bg-yellow-50 transition-colors">
                        <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-bold">Añadir Nuevo Miembro</span>
                    <div className="mt-4">
                        <WorkerDialog
                            mode="create"
                            trigger={
                                <Button variant="ghost" className="inset-0 absolute w-full h-full opacity-0">Add</Button>
                            }
                        />
                    </div>
                </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">Historial de accesos</h2>
                        <p className="text-xs text-slate-500">Últimas activaciones, cambios de rol, revocaciones y bajas.</p>
                    </div>
                </div>
                {accessAudit.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-slate-500">
                        Todavía no hay cambios de acceso registrados.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {accessAudit.map((entry) => (
                            <div key={entry.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {AUDIT_LABELS[entry.action] || entry.action}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {workerNames.get(entry.worker_id) || 'Trabajador eliminado'}
                                            {entry.actor_email ? ` · por ${entry.actor_email}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <time className="text-xs text-slate-400 sm:text-right" dateTime={entry.created_at}>
                                    {new Intl.DateTimeFormat('es-ES', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                        timeZone: 'Europe/Madrid',
                                    }).format(new Date(entry.created_at))}
                                </time>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
