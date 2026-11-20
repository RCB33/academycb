"use client";
import { MonthlyPaymentDot } from '@/components/admin/monthly-payment-dot';
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Search,
  Tent,
  Trophy,
  Users,
  Wallet,
  AlertCircle,
  Mail,
  SlidersHorizontal,
} from "lucide-react";
import {
  branchNames,
  type Branch,
  type WorkspaceData,
  type WorkspacePlayer,
  type WorkspaceRequest,
} from "@/lib/workspace-summary";
import { CreateStudentDialog } from "@/components/admin/create-student-dialog";
const euro = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
const panel =
  "rounded-[1.6rem] border border-slate-200/80 bg-white shadow-[0_5px_24px_-18px_rgba(12,34,65,0.25)]";
const branchStyles = {
  academy: "bg-blue-50 text-blue-800",
  campus: "bg-emerald-50 text-emerald-800",
  tournament: "bg-amber-50 text-amber-900",
};
const icons = { academy: GraduationCap, campus: Tent, tournament: Trophy };
export function BranchBadge({ branch }: { branch: Branch }) {
  const Icon = icons[branch];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${branchStyles[branch]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {branchNames[branch]}
    </span>
  );
}
export function PlayersOverview({
  players,
  compact = false,
}: {
  players: WorkspacePlayer[];
  compact?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [branch, setBranch] = useState("all"),
    [category, setCategory] = useState("all"),
    [debt, setDebt] = useState(false),
    [page, setPage] = useState(0);
  const filtered = players.filter(
    (p) =>
      (branch === "all" ||
        (branch === "none"
          ? !p.branches.length
          : p.branches.includes(branch as Branch))) &&
      (category === "all" || p.category === category) &&
      (!debt || p.pending > 0) &&
      `${p.name} ${p.guardians.join(" ")}`
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es")),
  );
  const size = compact ? 5 : 20,
    start =
      Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1)) * size;
  return (
    <section className={`${panel} overflow-hidden`}>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-navy">
              Jugadores y familias
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Una ficha por jugador. Toda su actividad, reunida.
            </p>
          </div>
          {compact ? (
            <Link
              href="/admin/crm/alumnos"
              className="inline-flex items-center gap-1 text-sm font-bold text-amber-800"
            >
              Ver todos <ArrowRight size={16} />
            </Link>
          ) : (
            <CreateStudentDialog />
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
          <input
            aria-label="Buscar jugador o tutor"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar jugador o tutor…"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["all", "Todos"],
            ...Object.entries(branchNames),
            ["none", "Sin vinculación"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={branch === id}
              onClick={() => {
                setBranch(id);
                setPage(0);
              }}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${branch === id ? "bg-navy text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-gold/15"}`}
            >
              {label}
            </button>
          ))}
          <button
            aria-pressed={debt}
            onClick={() => {
              setDebt(!debt);
              setPage(0);
            }}
            className={`ml-auto rounded-full border px-3 py-2 text-xs font-semibold ${debt ? "border-amber-400 bg-amber-50 text-amber-900" : "border-slate-200 text-slate-600"}`}
          >
            Con saldo pendiente
          </button>
        </div>
        {!compact && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <SlidersHorizontal size={15} />
            Categoría
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(0);
              }}
              className="rounded-lg border bg-white px-3 py-2"
            >
              <option value="all">Todas</option>
              {[...new Set(players.map((p) => p.category))].sort().map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span className="ml-auto text-xs">{filtered.length} jugadores</span>
          </label>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[550px] text-left text-sm">
          <thead className="bg-slate-50/90 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-6 py-3">Jugador / tutor</th>
              <th className="px-4 py-3">Actividades vigentes</th>
              <th className="px-4 py-3">Cuota de Academia</th><th className="px-4 py-3">Saldo vencido</th>
              <th className="px-5 py-3">
                <span className="sr-only">Ficha</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(start, start + size).map((p) => (
              <tr
                key={p.id}
                className="group border-t border-slate-100 transition hover:bg-amber-50/35"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/crm/alumnos/${p.id}`}
                    className="flex items-center gap-3"
                  >
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-xs font-bold text-navy sm:flex">
                      {p.name
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span>
                      <span className="block font-bold text-navy">
                        {p.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {p.guardians.length
                          ? p.guardians.join(" · ")
                          : "Tutor pendiente de vincular"}
                      </span>
                      {!compact && (
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {p.category}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {p.branches.map((b) => (
                      <div key={b}><BranchBadge branch={b}/><p className="mt-1 text-[11px] text-slate-500">{b==='academy'?(p.academyMethods||[]).join(' · '):'Transferencia bancaria'}</p></div>
                    ))}
                    {!p.branches.length && (
                      <span className="text-xs text-slate-400">
                        Sin plaza vigente
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4"><p className="mb-1 text-[11px] text-slate-500">{p.month}</p><MonthlyPaymentDot status={p.monthlyStatus||'missing'}/></td>
                <td className="px-4 py-4">
                  {p.pending > 0 ? (
                    <span className="whitespace-nowrap rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">
                      {euro(p.pending)}
                    </span>
                  ) : p.unallocated > 0 ? (
                    <span className="text-xs font-semibold text-slate-600">
                      Fechas por revisar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <Check size={12} />
                      Sin vencidos
                    </span>
                  )}
                  {p.pending > 0 && p.unallocated > 0 && (
                    <span className="mt-2 block text-[10px] text-slate-500">
                      + recibos sin fecha
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <Link
                    aria-label={`Ver ficha de ${p.name}`}
                    href={`/admin/crm/alumnos/${p.id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:bg-gold group-hover:text-navy"
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="p-10 text-center text-sm text-slate-500">
          No hay jugadores con estos filtros.
        </div>
      )}
      <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
        <span>
          {filtered.length
            ? `${start + 1}–${Math.min(start + size, filtered.length)} de ${filtered.length}`
            : "0 resultados"}{" "}
          · El saldo excluye cuotas futuras.
        </span>
        <div className="flex gap-2">
          <button
            disabled={!start}
            onClick={() => setPage(Math.max(0, page - 1))}
            aria-label="Jugadores anteriores"
            className="rounded-lg border p-2 disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            disabled={start + size >= filtered.length}
            onClick={() => setPage(page + 1)}
            aria-label="Siguientes jugadores"
            className="rounded-lg border p-2 disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </section>
  );
}
export function ManagementDashboard({ data }: { data: WorkspaceData }) {
  const router = useRouter(),
    [pending, startTransition] = useTransition();
  const requests = data.requests.filter((r) => r.needsReview),
    proofs = data.requests.filter((r) => r.proof);
  const active = data.players.filter((p) => p.branches.length).length;
  const cards = [
    {
      label: "Jugadores registrados",
      value: String(data.players.length),
      hint: `${active} con plaza vigente o próxima`,
      icon: Users,
      href: "/admin/crm/alumnos",
      color: "text-blue-700 bg-blue-50",
    },
    {
      label: "Solicitudes por revisar",
      value: String(requests.length),
      hint: "Academia, Campus y Torneos",
      icon: ClipboardCheck,
      href: "/admin/solicitudes",
      color: "text-amber-800 bg-amber-50",
    },
    {
      label: "Recibos pendientes",
      value: String(data.pendingCount),
      hint: `${euro(data.pending)} · vencidos hasta la fecha`,
      icon: Wallet,
      href: "/admin/finanzas",
      color: "text-rose-700 bg-rose-50",
    },
    {
      label: "Cobrado este mes",
      value: euro(data.received),
      hint: "Ingresos confirmados",
      icon: ArrowDownLeft,
      href: "/admin/finanzas",
      color: "text-emerald-700 bg-emerald-50",
    },
  ];
  return (
    <div
      className={`space-y-6 transition-opacity ${pending ? "opacity-60" : ""}`}
    >
      <header className="relative overflow-hidden rounded-[1.8rem] bg-navy px-6 py-7 text-white sm:px-8">
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[35px] border-gold/10"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold">
              Academy Costa Brava · Administración
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Tu academia, de un vistazo.
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              Jugadores, familias y próximos pasos. Todo en su sitio.
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
            <CalendarDays size={18} className="text-gold" />
            <span className="sr-only">Mes del resumen económico</span>
            <input
              aria-label="Mes del resumen económico"
              type="month"
              value={data.month}
              min="2020-01"
              max={data.today.slice(0, 7)}
              onChange={(e) => {
                if (e.target.value)
                  startTransition(() =>
                    router.push(`/admin/dashboard?month=${e.target.value}`),
                  );
              }}
              className="w-44 bg-transparent text-white outline-none [color-scheme:dark]"
            />
          </label>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`${panel} group p-4 transition duration-200 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg motion-reduce:transform-none sm:p-5`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.color}`}
              >
                <c.icon size={20} />
              </span>
              <ArrowUpRight
                size={17}
                className="text-slate-300 transition group-hover:text-gold"
              />
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500">
              {c.label}
            </p>
            <p className="mt-1 break-words text-2xl sm:text-3xl font-bold tracking-tight text-navy">
              {c.value}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              {c.hint}
            </p>
          </Link>
        ))}
      </div>
      <Link href={`/admin/finanzas/revision?month=${data.month}`} className="block rounded-2xl border border-gold/40 bg-amber-50 p-4 text-sm font-bold text-navy">Revisión de cuotas · validar efectivo, revisar Stripe y enviar recordatorios →</Link>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <PlayersOverview players={data.players} compact />
        <aside className={`${panel} space-y-4 p-5 sm:p-6`}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold" />
            <h2 className="text-lg font-bold text-navy">Por resolver</h2>
          </div>
          <Task
            count={requests.length}
            title="solicitudes de plaza"
            text="Revisa elección, grupo e importe antes de aceptar."
            href="/admin/solicitudes"
            action="Revisar solicitudes"
            primary
          />
          <Task
            count={proofs.length}
            title="justificantes de torneos"
            text="Comprueba el ingreso antes de confirmar el pago."
            href="/admin/solicitudes?filter=proof"
            action="Revisar justificantes"
          />
          {data.undated > 0 && (
            <Task
              count={data.undated}
              title="recibos sin vencimiento"
              text="Necesitan revisión; no se cuentan como deuda vencida."
              href="/admin/finanzas"
              action="Revisar fechas"
            />
          )}
          {data.failedEmails > 0 && (
            <Link
              href="/admin/actividades/correos"
              className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800"
            >
              <Mail size={16} />
              {data.failedEmails} correos requieren revisión{" "}
              <ArrowRight size={14} />
            </Link>
          )}
          <Link
            href="/admin/calendario"
            className="flex items-center justify-between border-t pt-4 text-sm font-semibold text-slate-600"
          >
            <span className="flex items-center gap-2">
              <CalendarDays size={17} />
              Ver agenda
            </span>
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${panel} p-6`}>
          <h2 className="text-xl font-bold text-navy">Gestión de Academia</h2>
          <p className="mt-1 text-sm text-slate-500">
            La oferta que ven las familias.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {(Object.keys(branchNames) as Branch[]).map((b) => {
              const Icon = icons[b];
              return (
                <Link
                  key={b}
                  href={`/admin/gestion/${b === "academy" ? "academia" : b === "tournament" ? "torneos" : "campus"}`}
                  className="group rounded-2xl border border-slate-200 p-4 text-center transition hover:border-gold hover:bg-amber-50/50"
                >
                  <Icon
                    size={26}
                    className="mx-auto text-navy transition group-hover:scale-110 motion-reduce:transform-none"
                  />
                  <strong className="mt-3 block text-sm text-navy">
                    {branchNames[b]}
                  </strong>
                  <span className="mt-1 block text-[10px] text-slate-400">
                    Horarios y precios
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        <section className={`${panel} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-navy">Cobros y finanzas</h2>
            <Wallet size={20} className="text-gold" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Movimientos registrados en el mes seleccionado.
          </p>
          <div className="mt-6 grid grid-cols-3 divide-x divide-slate-100">
            <Money
              label="Cobrado"
              value={data.received}
              color="text-emerald-700"
            />
            <Money
              label="Gastos"
              value={data.expenses}
              color="text-slate-600"
            />
            <Money
              label="Balance"
              value={data.received - data.expenses}
              color="text-navy"
            />
          </div>
          <Link
            href="/admin/finanzas"
            className="mt-6 flex items-center justify-end gap-2 text-sm font-bold text-amber-800"
          >
            Gestionar cobros y gastos <ArrowRight size={17} />
          </Link>
        </section>
      </div>
    </div>
  );
}
function Money({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="px-3 first:pl-0">
      <span className="text-xs text-slate-500">{label}</span>
      <strong
        className={`mt-2 block break-words text-lg font-bold sm:text-xl ${color}`}
      >
        {euro(value)}
      </strong>
    </div>
  );
}
function Task({
  count,
  title,
  text,
  href,
  action,
  primary = false,
}: {
  count: number;
  title: string;
  text: string;
  href: string;
  action: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${primary ? "border-gold/25 bg-amber-50/40" : "border-slate-200"}`}
    >
      <p className="font-bold text-navy">
        {count} {title}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{text}</p>
      <Link
        href={href}
        className={`mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold ${primary ? "bg-gold text-navy hover:bg-gold/85" : "border border-slate-200 bg-white text-navy hover:bg-slate-50"}`}
      >
        {action}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
const statusLabels: Record<string, string> = {
  new: "Nueva",
  contacted: "Contactada",
  interested: "En revisión",
  enrolled: "Plaza aceptada",
  lost: "Descartada",
  requested: "Por revisar",
  awaiting_payment: "Esperando transferencia",
  proof_review: "Justificante recibido",
  confirmed: "Confirmada",
  cancelled: "Anulada",
};
export function RequestInbox({
  requests,
  initialFilter = "pending",
}: {
  requests: WorkspaceRequest[];
  initialFilter?: string;
}) {
  const [query, setQuery] = useState(""),
    [branch, setBranch] = useState("all"),
    [filter, setFilter] = useState(initialFilter),
    [page, setPage] = useState(0);
  const filtered = requests.filter(
    (r) =>
      (branch === "all" || r.branch === branch) &&
      (filter === "all" ||
        (filter === "proof" && r.proof) ||
        (filter === "pending" && r.needsReview) ||
        (filter === "payment" && r.status === "awaiting_payment")) &&
      `${r.name} ${r.guardian} ${r.activity}`
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es")),
  );
  const start =
    Math.min(page, Math.max(0, Math.ceil(filtered.length / 20) - 1)) * 20;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [
            "pending",
            "Por revisar",
            requests.filter((r) => r.needsReview).length,
          ],
          ["proof", "Justificantes", requests.filter((r) => r.proof).length],
          [
            "payment",
            "Esperando pago",
            requests.filter((r) => r.status === "awaiting_payment").length,
          ],
          ["all", "Todas", requests.length],
        ].map(([id, label, count]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            onClick={() => {
              setFilter(String(id));
              setPage(0);
            }}
            className={`${panel} p-5 text-left transition ${filter === id ? "border-gold bg-amber-50 ring-1 ring-gold/40" : "hover:border-gold/50"}`}
          >
            <span className="text-xs text-slate-500">{label}</span>
            <strong className="mt-2 block text-3xl text-navy">{count}</strong>
          </button>
        ))}
      </div>
      <div className={`${panel} p-5`}>
        <div className="flex flex-wrap gap-3">
          <input
            aria-label="Buscar solicitud"
            placeholder="Jugador, tutor o actividad…"
            className="min-h-11 min-w-0 flex-1 rounded-xl border px-4 text-sm"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="Actividad de la solicitud"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border bg-white px-3 text-sm"
          >
            <option value="all">Todas las actividades</option>
            {Object.entries(branchNames).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {filtered.slice(start, start + 20).map((r) => (
            <article
              key={r.source + r.id}
              className="flex flex-wrap items-center gap-4 py-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <BranchBadge branch={r.branch} />
                  <span className="text-xs text-slate-500">
                    {statusLabels[r.status] || r.status}
                  </span>
                </div>
                <h2 className="mt-3 font-bold text-navy">{r.name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Tutor: {r.guardian} · {r.activity}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {new Date(r.created).toLocaleDateString("es-ES")} · Ref.{" "}
                  {r.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                {r.amount !== null && (
                  <p className="text-sm font-bold text-navy">
                    {euro(r.amount)}
                  </p>
                )}
                <Link
                  href={r.href}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white"
                >
                  {r.needsReview || r.proof ? "Revisar" : "Ver detalle"}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <div className="py-14 text-center">
            <Check className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
            <p className="font-semibold text-navy">
              Sin solicitudes con este filtro
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Consulta «Todas» para ver el historial.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-4 text-xs text-slate-500">
          <span>{filtered.length} solicitudes</span>
          <div className="flex gap-3">
            <button
              disabled={!start}
              onClick={() => setPage(Math.max(0, page - 1))}
              className="rounded-lg border px-3 py-2 disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              disabled={start + 20 >= filtered.length}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border px-3 py-2 disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
      <p className="flex items-start gap-2 text-xs text-slate-500">
        <AlertCircle size={15} className="shrink-0" />
        Aceptar una plaza no confirma un ingreso. Las solicitudes aceptadas de
        Academia y Campus se cobran desde Finanzas; el justificante de torneos
        se revisa en su inscripción.
      </p>
    </div>
  );
}
