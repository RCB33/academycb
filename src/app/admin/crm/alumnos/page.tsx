import Link from "next/link";
import { getAdminWorkspace } from "@/lib/admin-workspace";
import { PlayersOverview } from "@/components/management/dashboard";
export default async function Players() {
  const data = await getAdminWorkspace();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
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
        <div className="flex flex-wrap gap-3">
        <Link href="/admin/crm/tutores" className="rounded-xl border bg-white px-4 py-3 text-xs font-semibold">Tutores →</Link>
        <Link
          href="/admin/crm/alumnos/archivo"
          className="rounded-xl border bg-white px-4 py-3 text-xs font-semibold"
        >
          Archivo y herramientas →
        </Link>
        </div>
      </header>
      <PlayersOverview players={data.players} />
    </div>
  );
}
