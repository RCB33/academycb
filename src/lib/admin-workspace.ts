import { paymentChoicesText, requestedPaymentChoices } from '@/lib/enrollment-payment';
import "server-only";
import { agreedAcademyMethod, monthlyPaymentStatus } from './monthly-payment-status';
import { isCurrentTournamentRegistration } from "@/lib/christmas-tournaments";
import { requireAdmin } from "@/lib/auth";
import { adminReadAll } from "@/lib/admin-read-all";
import {
  financialSummary,
  isCurrentPlace,
  type Branch,
  type WorkspaceData,
  type WorkspaceRequest,
  type SummaryReceipt,
} from "@/lib/workspace-summary";
export async function getAdminWorkspace(
  monthInput?: string,
): Promise<WorkspaceData> {
  const { supabase } = await requireAdmin();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Madrid",
  });
  const month =
    monthInput && /^20\d{2}-(0[1-9]|1[0-2])$/.test(monthInput)
      ? monthInput
      : today.slice(0, 7);
  const [
    children,
    members,
    campus,
    tournaments,
    payments,
    enrollments,
    events,
    expenses,
    emails,
  ] = await Promise.all([
    adminReadAll((f, t) =>
      supabase
        .from("children")
        .select(
          "id,full_name,category:categories(name),guardians:child_guardians(guardian:guardians(full_name))",
        )
        .is("archived_at", null)
        .order("id")
        .range(f, t),
    ),
    adminReadAll((f, t) =>
      supabase
        .from("academy_memberships")
        .select("id,child_id,status,end_date,agreed_payment_method,payment_method")
        .order("id")
        .range(f, t),
    ),
    adminReadAll((f, t) =>
      supabase
        .from("campus_enrollments")
        .select("id,child_id,status,campus:campuses(end_date)")
        .order("id")
        .range(f, t),
    ),
    adminReadAll((f, t) =>
      supabase
        .from("tournament_players")
        .select("id,child_id,status,tournament:tournaments_internal(end_date)")
        .order("id")
        .range(f, t),
    ),
    adminReadAll((f, t) =>
      supabase
        .from("payments")
        .select(
          "id,child_id,amount,status,type,concept_code,due_date,covered_month,paid_at,manual_receipt_allocations(amount,paid_date,method,voided_at)",
        )
        .order("id")
        .range(f, t),
    ),
    adminReadAll((f, t) =>
      supabase
        .from("enrollment_requests")
        .select(
          "id,service,child_name,guardian_name,activity_name,status,created_at,academy_details,campus_details",
        )
        .order("id")
        .range(f, t),
    ),
    adminReadAll((f, t) =>
      supabase
        .from("event_registrations")
        .select(
          "id,child_id,campaign,status,details,quoted_amount,approved_amount,created_at",
        )
        .order("id")
        .range(f, t),
    ),
    adminReadAll((f, t) =>
      supabase
        .from("expenses")
        .select("id,amount")
        .is("deleted_at", null)
        .gte("date", month + "-01")
        .lt(
          "date",
          new Date(
            Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1),
          )
            .toISOString()
            .slice(0, 10),
        )
        .order("id")
        .range(f, t),
    ),
    supabase
      .from("registration_email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);
  if (emails.error)
    throw Error("No se pudo consultar el estado de los correos.");
  const one = <T>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
  const finance = financialSummary(
    payments.data as SummaryReceipt[],
    month,
    today,
  );
  const branches = new Map<string, Set<Branch>>();
  const add = (id: string, branch: Branch) => {
    if (!branches.has(id)) branches.set(id, new Set());
    branches.get(id)!.add(branch);
  };
  members.data
    .filter((r) => isCurrentPlace(r.status, r.end_date, today))
    .forEach((r) => add(r.child_id, "academy"));
  campus.data
    .filter((r) =>
      isCurrentPlace(r.status, one(r.campus)?.end_date || null, today),
    )
    .forEach((r) => add(r.child_id, "campus"));
  tournaments.data
    .filter((r) =>
      isCurrentPlace(r.status, one(r.tournament)?.end_date || null, today),
    )
    .forEach((r) => add(r.child_id, "tournament"));
  events.data.filter(r=>isCurrentTournamentRegistration(r.status,r.campaign,today)).forEach(r=>add(r.child_id,"tournament"));
  const requests: WorkspaceRequest[] = [
    ...enrollments.data.map((r) => ({
      id: r.id,
      source: "enrollment" as const,
      branch: r.service as Branch,
      name: r.child_name,
      guardian: r.guardian_name,
      activity: r.activity_name,
      paymentChoices: paymentChoicesText(requestedPaymentChoices(r)),
      status: r.status,
      created: r.created_at,
      amount:
        r.academy_details?.accepted?.first_total ??
        r.academy_details?.quote?.first_total ??
        r.campus_details?.quoted_amount ??
        null,
      href:
        r.service === "campus"
          ? `/admin/campus/solicitudes?request=${r.id}`
          : `/admin/leads?request=${r.id}`,
      needsReview: ["new", "contacted", "interested"].includes(r.status),
      proof: false,
    })),
    ...events.data.map((r) => ({
      id: r.id,
      source: "event" as const,
      branch: "tournament" as const,
      name: String(r.details.child_name || "Jugador"),
      guardian: String(r.details.guardian_name || ""),
      activity: "Torneos · Navidad 2026–2027",
      paymentChoices: "Torneos: Transferencia bancaria",
      status: r.status,
      created: r.created_at,
      amount: Number(r.approved_amount ?? r.quoted_amount),
      href: `/admin/torneos/inscripciones?request=${r.id}`,
      needsReview: r.status === "requested",
      proof: r.status === "proof_review",
    })),
  ].sort((a, b) => b.created.localeCompare(a.created));
  return {
    month,
    today,
    players: children.data.map((c) => ({
      id: c.id,
      name: c.full_name,
      month,
      monthlyStatus: monthlyPaymentStatus(payments.data.filter(p=>p.child_id===c.id),month),
      academyMethods: [...new Set(members.data.filter(m=>m.child_id===c.id&&isCurrentPlace(m.status,m.end_date,today)).map(m=>agreedAcademyMethod(m.agreed_payment_method,m.payment_method)))],
      category: one(c.category)?.name || "Por asignar",
      guardians: c.guardians.flatMap((g) => one(g.guardian)?.full_name || []),
      branches: [...(branches.get(c.id) || [])],
      ...(finance.balances.get(c.id) || {
        pending: 0,
        unallocated: 0,
        receiptCount: 0,
      }),
    })),
    requests,
    received: finance.received,
    pending: finance.pending,
    pendingCount: finance.pendingCount,
    undated: finance.undated,
    expenses:
      Math.round(
        expenses.data.reduce(
          (n, e) => n + Math.round(Number(e.amount) * 100),
          0,
        ),
      ) / 100,
    failedEmails: emails.count || 0,
  };
}
