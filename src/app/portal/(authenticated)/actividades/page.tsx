import { getT } from '@/lib/i18n/server';
import { ActivityPaymentSummary } from '@/components/activity-payment-summary';
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  GraduationCap,
  Tent,
  Trophy,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { getFamilyContext } from "@/lib/family-context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampusOffers } from "@/lib/offering-server";
import { adminReadAll } from "@/lib/admin-read-all";
const state: Record<string, string> = {
  new: "Solicitud enviada",
  contacted: "En revisión",
  interested: "En revisión",
  enrolled: "Plaza aceptada",
  lost: "Solicitud cerrada",
  active: "Plaza activa",
  pending_payment: "Plaza aceptada · pago pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  requested: "Solicitud enviada",
  awaiting_payment: "Aceptada · transferencia pendiente",
  proof_review: "Justificante en revisión",
  paused: "En pausa",
  completed: "Finalizada",
  paid: "Pagada",
};
export default async function FamilyActivities({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const translate=await getT();
  const family = await getFamilyContext(true);
  if (!family) redirect("/portal");
  const selected = (await searchParams).child,
    ids = family.children
      .filter((c) => !selected || c.id === selected)
      .map((c) => c.id);
  if (selected && !ids.length) redirect("/portal/actividades");
  const db = await createClient(),
    admin = createAdminClient();
  const [campuses, members, campusLinks, eventRows, requests, assignments] =
    await Promise.all([
      getCampusOffers(),
      ids.length
        ? adminReadAll((f, t) =>
            db
              .from("academy_memberships")
              .select(
                "id,child_id,status,start_date,end_date,plan:membership_plans(name)",
              )
              .in("child_id", ids)
              .order("id")
              .range(f, t),
          )
        : Promise.resolve({ data: [] }),
      ids.length
        ? adminReadAll((f, t) =>
            db
              .from("campus_enrollments")
              .select(
                "id,child_id,status,campus:campuses(name,start_date,end_date)",
              )
              .in("child_id", ids)
              .order("id")
              .range(f, t),
          )
        : Promise.resolve({ data: [] }),
      adminReadAll((f, t) =>
        db
          .from("event_registrations")
          .select(
            "id,child_id,status,details,approved_amount,quoted_amount,created_at",
          )
          .eq("user_id", family.userId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(f, t),
      ),
      // Ownership is the verified Auth ID. Never trust an email from a query string.
      adminReadAll((f, t) =>
        admin
          .from("enrollment_requests")
          .select(
            "id,linked_child_id,child_name,activity_name,status,created_at,service,academy_details,campus_details",
          )
          .eq("submitted_by", family.userId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(f, t),
      ),
      ids.length ? adminReadAll((f,t) => db.from('academy_group_assignments').select('membership_id,team:teams(name,schedule)').in('child_id',ids).order('membership_id').order('team_id').range(f,t)) : Promise.resolve({data: []}),
    ]);
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
  const name = (id: string) =>
    family.children.find((c) => c.id === id)?.full_name || "Jugador";
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Madrid",
  });
  const date = (value: string | null | undefined) => value ? new Date(`${value.slice(0,10)}T12:00:00Z`).toLocaleDateString(translate.locale,{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Madrid'}) : 'Fin por confirmar';
  const activities = [
    ...members.data.map((m) => ({
      id: m.id,
      name: name(m.child_id),
      title: one(m.plan)?.name || "Academia",
      status: m.status,
      detail: `${date(m.start_date)} — ${date(m.end_date)}`,
      kind: 'Academia',
      groups: assignments.data.filter(g=>g.membership_id===m.id).map(g=>one(g.team)).filter(Boolean).map(g=>`${g!.name} · ${g!.schedule}`),
      href: "/portal/pagos",
    })),
    ...campusLinks.data.map((c) => ({
      id: c.id,
      name: name(c.child_id),
      title: one(c.campus)?.name || "Campus",
      status: c.status,
      detail: `${date(one(c.campus)?.start_date)} — ${date(one(c.campus)?.end_date)}`,
      kind: 'Campus', groups: [],
      href: "/portal/pagos",
    })),
    ...eventRows.data
      .filter((e) => !selected || e.child_id === selected)
      .map((e) => ({
        id: e.id,
        name: String(e.details.child_name || name(e.child_id)),
        title: "Torneos · Navidad 2026–2027",
        kind: "Torneos", groups: [],
        status: e.status,
        detail: `Importe ${e.approved_amount !== null ? "validado" : "solicitado"}: ${Number(e.approved_amount ?? e.quoted_amount).toFixed(2)} €`,
        href: "/torneos/inscripcion",
      })),
  ];
  const pending = requests.data.filter(
    (r) =>
      !["enrolled", "lost"].includes(r.status) &&
      (!selected || r.linked_child_id === selected),
  );
  return translate(
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl bg-navy p-7 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">
          Portal familiar
        </p>
        <h1 className="mt-3 text-3xl font-bold">Mis actividades</h1>
        <p className="mt-3 text-sm text-slate-300">
          Suscripciones, horarios y nuevas experiencias. Todo para seguir disfrutando del fútbol.
        </p>
      </header>
      <nav
        aria-label="Filtrar actividades por hijo"
        className="flex flex-wrap gap-2"
      >
        <Link
          href="/portal/actividades"
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${!selected ? "bg-navy text-white" : "bg-white"}`}
        >
          Toda la familia
        </Link>
        {family.children.map((c) => (
          <Link
            key={c.id}
            href={`/portal/actividades?child=${c.id}`}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${selected === c.id ? "bg-navy text-white" : "bg-white"}`}
          >
            {c.full_name}
          </Link>
        ))}
      </nav>
      <section aria-labelledby="subscriptions-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Ya formas parte</p><h2 id="subscriptions-heading" className="mt-1 text-2xl font-black text-navy">Tus suscripciones e inscripciones</h2></div><Link href="/portal/pagos" className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-navy">Consultar pagos →</Link></div>
        <div className="grid gap-4 lg:grid-cols-2">{activities.map(a=><article key={a.id} className="relative overflow-hidden rounded-3xl border border-gold/30 bg-white p-6 shadow-sm">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gold" />
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-bold text-navy">{a.kind}</span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${['active','confirmed','paid'].includes(a.status)?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}><CheckCircle2 size={14}/>{state[a.status]||a.status}</span></div>
          <p className="mt-5 text-sm font-semibold text-amber-700">{a.name}</p><h3 className="mt-1 text-xl font-bold text-navy">{a.title}</h3>
          <div className="mt-4 space-y-2">{a.groups.map(g=><p key={g} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-navy"><Clock3 size={18} className="mt-0.5 shrink-0 text-amber-700"/>{g}</p>)}<p className="flex items-center gap-2 text-sm text-slate-500"><CalendarDays size={16}/>{a.detail}</p></div>
          <div className="mt-5 flex flex-wrap gap-3"><Link href="/portal/calendario" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Ver calendario</Link><Link href={a.href} className="rounded-xl border px-4 py-2.5 text-sm font-bold text-navy">Ver detalle →</Link></div>
        </article>)}</div>
        {!activities.length&&<p className="rounded-3xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">Tu próxima experiencia empieza aquí. Elige una actividad y solicita tu plaza.</p>}
      </section>
      <div className="pt-3"><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Sigue sumando experiencias</p><h2 className="mt-1 text-2xl font-black text-navy">Más fútbol, más momentos juntos</h2><p className="mt-2 text-sm text-slate-500">Utiliza la ficha de tu hijo para solicitar una nueva plaza. El equipo revisará la disponibilidad.</p></div>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Más sesiones de Academia",
            icon: GraduationCap,
            description: "Sigue creciendo con nuevos días y grupos de entrenamiento.",
            href: "/inscripcion?service=academy",
            cta: "Apuntarme a Academia",
          },
          {
            title: "Vive el campus",
            icon: Tent,
            description: "Semanas, packs y tecnificación de porteros.",
            href: "#campus-disponibles",
            cta: "Ver campus disponibles",
          },
          {
            title: "Compite con Academy",
            icon: Trophy,
            description: "Compite con Academy usando la ficha de tu hijo.",
            href: "/torneos/inscripcion",
            cta: "Apuntarme a torneos",
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-gold motion-reduce:transform-none"
          >
            <item.icon className="h-8 w-8 text-amber-700" />
            <h2 className="mt-4 text-xl font-bold text-navy">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {item.description}
            </p>
            <span className="mt-5 flex items-center gap-2 text-sm font-bold text-navy">
              {item.cta}
              <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
      {pending.length > 0 && (
        <section className="rounded-3xl border border-gold/30 bg-amber-50/50 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
            <ClipboardCheck size={20} />
            Solicitudes pendientes de respuesta
          </h2>
          <div className="mt-4 space-y-3">
            {pending.map((r) => (
              <article key={r.id} className="rounded-xl bg-white p-4">
                <strong className="text-sm">
                  {r.child_name} · {r.activity_name}
                </strong>
                <p className="mt-1 text-xs text-slate-500">
                  {state[r.status] || r.status} · Ref.{" "}
                  {r.id.slice(0, 8).toUpperCase()}
                </p>
                <ActivityPaymentSummary request={r} />
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-600">
            El equipo revisará la plaza y te escribirá con los siguientes pasos.
            Todavía no realices el pago.
          </p>
        </section>
      )}
      <section id="campus-disponibles" className="scroll-mt-6 space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-navy">
          <CalendarDays size={21} />
          Campus disponibles
        </h2>
        {campuses
          .filter((c) => c.end_date >= today)
          .map((c) => (
            <article
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border bg-white p-6"
            >
              <div>
                <h3 className="text-lg font-bold text-navy">{c.name}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {date(c.start_date)} — {date(c.end_date)} · {c.schedule}
                </p>
                <p className="mt-1 text-sm text-slate-500">{c.location}</p>
                <p className="mt-3 text-sm font-semibold">
                  Desde{" "}
                  {Math.min(...c.public_program.weeks.map((w) => w.price))} € ·
                  Pack completo {c.public_program.pack_price} €
                </p>
              </div>
              <Link
                href={`/portal/campus/inscripcion?edition=${c.id}${selected ? "&child=" + selected : ""}`}
                className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-navy"
              >
                Apuntar a mi hijo →
              </Link>
            </article>
          ))}
        {!campuses.some((c) => c.end_date >= today) && (
          <p className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
            Ahora mismo no hay campus abiertos. Las nuevas ediciones aparecerán
            aquí.
          </p>
        )}
      </section>
    </div>
  );
}
