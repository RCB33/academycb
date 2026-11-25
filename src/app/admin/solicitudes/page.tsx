import { requireAdmin } from "@/lib/auth";
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
  const {supabase}=await requireAdmin();
  const {data:families}=await supabase.from("family_billing_batches").select("id,family_billing_members(request:enrollment_requests(child_name,guardian_name))").order("created_at",{ascending:false}).limit(30);
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
      {!!families?.length && <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold text-navy">Pagos familiares · hermanos</h2><div className="mt-3 flex flex-wrap gap-3">{families.map(f=><Link key={f.id} className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-navy" href={`/admin/solicitudes/familia/${f.id}`}>{f.family_billing_members.flatMap(m=>Array.isArray(m.request)?m.request:[m.request]).filter(Boolean).map(r=>r.child_name).join(" + ")} →</Link>)}</div></section>}
      <Link href="/admin/torneos/solicitudes" className="inline-flex rounded-xl border bg-white px-5 py-3 font-bold text-navy">Solicitudes de torneos 2027 →</Link>
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
