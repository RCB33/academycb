import { receiptBalance, type ReceiptAllocation } from "@/lib/receipt-balance";
export type Branch = "academy" | "campus" | "tournament";
export const branchNames: Record<Branch, string> = {
  academy: "Academia",
  campus: "Campus",
  tournament: "Torneos",
};
export type WorkspacePlayer = {
  month?: string;
  monthlyStatus?: import('./monthly-payment-status').MonthlyStatus;
  academyMethods?: string[];
  id: string;
  name: string;
  category: string;
  guardians: string[];
  branches: Branch[];
  pending: number;
  unallocated: number;
  receiptCount: number;
};
export type WorkspaceRequest = {
  id: string;
  source: "enrollment" | "event";
  branch: Branch;
  name: string;
  guardian: string;
  activity: string;
  status: string;
  created: string;
  amount: number | null;
  href: string;
  needsReview: boolean;
  proof: boolean;
};
export type SummaryReceipt = {
  id: string;
  child_id: string | null;
  amount: number | string;
  status: string;
  due_date: string | null;
  covered_month: string | null;
  paid_at: string | null;
  manual_receipt_allocations: ReceiptAllocation[] | null;
};
export function financialSummary(
  receipts: SummaryReceipt[],
  month: string,
  today: string,
) {
  const end = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const monthEnd = `${month}-${end}`;
  const cutoff = monthEnd < today ? monthEnd : today;
  let received = 0,
    pending = 0,
    pendingCount = 0,
    undated = 0;
  const balances = new Map<
    string,
    { pending: number; unallocated: number; receiptCount: number }
  >();
  for (const r of receipts) {
    const allocations = r.manual_receipt_allocations || [];
    if (allocations.length)
      received += allocations
        .filter((a) => !a.voided_at && a.paid_date.slice(0, 7) === month)
        .reduce((n, a) => n + Math.round(Number(a.amount) * 100), 0);
    else if (r.status === "paid" && r.paid_at?.slice(0, 7) === month)
      received += Math.round(Number(r.amount) * 100);
    const balance = receiptBalance(r).remaining;
    if (balance <= 0 || !["pending", "failed", "overdue"].includes(r.status))
      continue;
    // Future installments are not debt due today. Missing due dates need review.
    const isDue = Boolean(r.due_date && r.due_date <= cutoff),
      noDate = !r.due_date;
    if (isDue) {
      pending += Math.round(balance * 100);
      pendingCount++;
    }
    if (noDate) undated++;
    if (r.child_id && (isDue || noDate)) {
      const value = balances.get(r.child_id) || {
        pending: 0,
        unallocated: 0,
        receiptCount: 0,
      };
      if (isDue) {
        value.pending += Math.round(balance * 100);
        value.receiptCount++;
      } else value.unallocated += Math.round(balance * 100);
      balances.set(r.child_id, value);
    }
  }
  return {
    received: received / 100,
    pending: pending / 100,
    pendingCount,
    undated,
    balances: new Map(
      [...balances].map(([id, v]) => [
        id,
        { ...v, pending: v.pending / 100, unallocated: v.unallocated / 100 },
      ]),
    ),
  };
}
export function isCurrentPlace(
  status: string,
  end: string | null,
  today: string,
) {
  return (
    [
      "active",
      "pending_payment",
      "confirmed",
      "paid",
      "registered",
      "selected",
    ].includes(status) &&
    (!end || end >= today)
  );
}
export type WorkspaceData = {
  month: string;
  today: string;
  players: WorkspacePlayer[];
  requests: WorkspaceRequest[];
  received: number;
  pending: number;
  pendingCount: number;
  undated: number;
  expenses: number;
  failedEmails: number;
};
