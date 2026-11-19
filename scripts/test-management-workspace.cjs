const assert = require("node:assert/strict");
const fs = require("node:fs"),
  ts = require("typescript");
function loader(overrides = {}) {
  const cache = {};
  return function load(file) {
    if (cache[file]) return cache[file];
    const m = { exports: {} };
    new Function(
      "module",
      "exports",
      "require",
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    )(m, m.exports, (name) =>
      name in overrides
        ? overrides[name]
        : name === "server-only"
          ? {}
          : name.startsWith("@/")
            ? load("src/" + name.slice(2) + ".ts")
            : require(name),
    );
    return (cache[file] = m.exports);
  };
}
const { financialSummary, isCurrentPlace } = loader()(
  "src/lib/workspace-summary.ts",
);
const receipt = (id, amount, extra = {}) => ({
  id,
  child_id: "child",
  amount,
  status: "pending",
  due_date: "2026-11-01",
  covered_month: "2026-11",
  paid_at: null,
  manual_receipt_allocations: [],
  ...extra,
});
const a = (amount, date, voided_at = null) => ({
  amount,
  paid_date: date,
  method: "transfer",
  voided_at,
});
const s = financialSummary(
  [
    receipt("partial", 100, {
      manual_receipt_allocations: [
        a(25, "2026-11-04"),
        a(10, "2026-10-01"),
        a(50, "2026-11-06", "void"),
      ],
    }),
    receipt("future", 300, { due_date: "2026-12-01" }),
    receipt("undated", 90, { due_date: null }),
    receipt("cancelled", 80, { status: "cancelled" }),
    receipt("paid", 75, { status: "paid", paid_at: "2026-11-05T12:00:00Z" }),
    receipt("paid-undated", 500, { status: "paid" }),
    receipt("cents", "0.30", {
      manual_receipt_allocations: [a("0.10", "2026-11-02")],
    }),
  ],
  "2026-11",
  "2026-11-19",
);
assert.equal(s.received, 100.1);
assert.equal(s.pending, 65.2);
assert.equal(s.pendingCount, 2);
assert.equal(s.undated, 1);
assert.deepEqual(s.balances.get("child"), {
  pending: 65.2,
  unallocated: 90,
  receiptCount: 2,
});
assert.equal(
  financialSummary([receipt("future", 75)], "2026-10", "2026-11-19").pending,
  0,
);
assert.equal(
  isCurrentPlace("pending_payment", "2027-01-07", "2026-11-19"),
  true,
);
assert.equal(isCurrentPlace("active", "2026-05-31", "2026-11-19"), false);
assert.equal(isCurrentPlace("cancelled", null, "2026-11-19"), false);
(async () => {
  let family = null,
    inserted = [],
    emails = [],
    duplicate = false;
  const campusId = "11111111-1111-4111-8111-111111111111",
    childId = "22222222-2222-4222-8222-222222222222";
  const campus = {
    id: campusId,
    name: "Campus fixture",
    end_date: "2099-01-07",
    updated_at: "v1",
    public_program: {
      birth_from: 2013,
      birth_to: 2022,
      weeks: [
        { id: "1", label: "Semana 1", price: 89 },
        { id: "2", label: "Semana 2", price: 99 },
        { id: "3", label: "Semana 3", price: 89 },
      ],
      pack_price: 197,
      sibling_discount: 5,
    },
  };
  const db = {
    from: () => ({
      insert: async (row) => {
        inserted.push(row);
        return { error: null };
      },
      select: () => {
        const q = {
          eq: () => q,
          in: () => q,
          limit: async () => ({
            data: duplicate ? [{ id: "existing" }] : [],
            error: null,
          }),
        };
        return q;
      },
    }),
  };
  const { POST } = loader({
    "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/family-context": { getFamilyContext: async () => family },
    "@/lib/offering-server": { getCampusOffer: async () => campus },
    "@/lib/registration-email": {
      deliverRegistrationEmails: async (...args) => emails.push(args),
    },
  })("src/app/api/campus-enrollment/route.ts");
  const payload = {
    campus_id: campusId,
    offer_version: "v1",
    child_name: "Fixture",
    birth_date: "2016-01-01",
    team: "Sin equipo",
    role: "Portero",
    guardian_name: "Tutor fixture",
    email: "fixture@example.invalid",
    phone: "600000000",
    allergies: "Ninguna",
    health_card: "FIXTURE",
    medical_consent: "Sí",
    weeks: ["1"],
    preferences: "",
    size: "",
    sibling: false,
    sibling_name: "",
    image_consent: "No",
    reason: "Otros",
    expectations: "Aprender",
    payment_consent: true,
    privacy_consent: true,
    health_consent: true,
    terms_consent: true,
    website: "",
  };
  const send = (extra = {}, origin = "https://academy.example") =>
    POST(
      new Request("https://academy.example/api/campus-enrollment", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ...extra }),
      }),
    );
  assert.equal((await send({}, "https://foreign.example")).status, 403);
  assert.equal((await send({ linked_child_id: childId })).status, 403);
  assert.equal(inserted.length, 0);
  assert.equal(emails.length, 0);
  assert.equal((await send()).status, 201);
  assert.equal(inserted[0].linked_child_id, null);
  family = {
    userId: "parent",
    email: "verified@example.invalid",
    children: [
      { id: childId, full_name: "Canonical player", birth_date: "2015-03-02" },
    ],
  };
  assert.equal(
    (
      await send({
        linked_child_id: childId,
        child_name: "Forged",
        birth_date: "2018-01-01",
        email: "other@example.invalid",
      })
    ).status,
    201,
  );
  assert.equal(inserted[1].child_name, "Canonical player");
  assert.equal(inserted[1].birth_date, "2015-03-02");
  assert.equal(inserted[1].email, family.email);
  assert.equal(inserted[1].submitted_by, "parent");
  assert.equal(inserted[1].campus_details.quoted_amount, 89);
  duplicate = true;
  assert.equal((await send({ linked_child_id: childId })).status, 409);
  assert.equal((await send({ offer_version: "stale" })).status, 409);
  assert.equal(inserted.length, 2);
  assert.equal(emails.length, 2);
  console.log(
    "PASS: dashboard partial/voided payments, cents, future installments, undated receipts, activity status; Campus ownership, canonical identity, duplicate request, stale offer and foreign origin. Mock-only: no real writes or emails.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
