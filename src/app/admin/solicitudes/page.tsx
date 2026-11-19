import Link from "next/link";
import { getAdminWorkspace } from "@/lib/admin-workspace";
import { RequestInbox } from "@/components/management/dashboard";
export default async function Requests({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const data = await getAdminWorkspace(),
    filter = (await searchParams).filter;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Academia · Campus · Torneos
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">
            Solicitudes
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Una bandeja para revisar plazas y acompañar a cada familia.
          </p>
        </div>
        <Link
          href="/admin/leads"
          className="rounded-xl border bg-white px-4 py-3 text-xs font-semibold"
        >
          Contactos y consultas comerciales →
        </Link>
      </header>
      <RequestInbox
        requests={data.requests}
        initialFilter={
          ["all", "proof", "payment"].includes(filter || "")
            ? filter
            : "pending"
        }
      />
    </div>
  );
}
