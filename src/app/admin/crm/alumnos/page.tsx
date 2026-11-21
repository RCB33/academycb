import Link from "next/link";
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
            Los datos de sus tutores, actividades y pagos están en la ficha de cada jugador.
          </p>
        </div>
        <Link
          href="/admin/crm/alumnos/archivo"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
        >
          Archivo y herramientas →
        </Link>
      </header>
      <PlayersOverview players={data.players} />
    </div>
  );
}
