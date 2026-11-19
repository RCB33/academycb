import { redirect } from "next/navigation";
import Link from "next/link";
import { getCampusOffer } from "@/lib/offering-server";
import { getFamilyContext } from "@/lib/family-context";
import CampusForm from "@/app/(public)/campus/inscripcion/campus-form";
export default async function CampusEnrollment({
  searchParams,
}: {
  searchParams: Promise<{ edition?: string; child?: string }>;
}) {
  const params = await searchParams,
    family = await getFamilyContext();
  if (!family) redirect("/portal");
  const campus = await getCampusOffer(params.edition);
  if (!campus || campus.end_date < new Date().toISOString().slice(0, 10))
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">
          Este campus no admite solicitudes
        </h1>
        <Link href="/portal/actividades" className="mt-4 block underline">
          Volver a mis actividades
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/portal/actividades"
        className="text-sm font-semibold text-amber-800"
      >
        ← Mis actividades
      </Link>
      <header className="mt-5 rounded-3xl bg-navy p-7 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">
          Nueva solicitud
        </p>
        <h1 className="mt-3 text-3xl font-bold">{campus.name}</h1>
        <p className="mt-3 text-sm text-slate-300">
          {campus.schedule} · {campus.location}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {campus.start_date} — {campus.end_date}
        </p>
      </header>
      <CampusForm campus={campus} family={family} initialChild={params.child} />
    </div>
  );
}
