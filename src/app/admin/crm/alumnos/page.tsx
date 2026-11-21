import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";
import { getAdminWorkspace } from "@/lib/admin-workspace";
import { PlayersOverview } from "@/components/management/dashboard";
export default async function Players() {
  const data = await getAdminWorkspace();
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Academy Costa Brava
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">
            Jugadores
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Tutor, actividades y pagos en una sola ficha.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <Link
            href="/admin/crm/tutores"
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-gold px-6 py-3 text-base font-bold text-navy shadow-sm transition-colors hover:bg-gold/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
          >
            <UsersRound className="h-5 w-5 shrink-0" aria-hidden="true" />
            Tutores
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
          <Link
            href="/admin/crm/alumnos/archivo"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
          >
            Archivo y herramientas →
          </Link>
        </div>
      </header>
      <PlayersOverview players={data.players} />
    </div>
  );
}
