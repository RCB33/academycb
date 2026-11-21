import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
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
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
          className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gold px-6 py-3 text-base font-bold text-navy shadow-sm transition-colors hover:bg-gold/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 lg:w-auto"
        >
          <MessageSquare className="h-5 w-5 shrink-0" aria-hidden="true" />
          Consultas comerciales
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
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
