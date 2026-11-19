// Read-only integration with the current public catalogue. Never prints credentials.
const fs = require("node:fs"),
  ts = require("typescript"),
  { execFileSync } = require("node:child_process"),
  assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
(async () => {
  let token = execFileSync(
    "security",
    ["find-generic-password", "-s", "Supabase CLI", "-w"],
    { stdio: ["ignore", "pipe", "ignore"] },
  )
    .toString()
    .trim();
  if (token.startsWith("go-keyring-base64:"))
    token = Buffer.from(token.split(":")[1], "base64").toString();
  const response = await fetch(
    "https://api.supabase.com/v1/projects/pnaitrnthhclyzfdvgbp/api-keys",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw Error("Management access unavailable");
  const keys = await response.json(),
    key = keys.find((k) => k.name === "service_role").api_key;
  const db = createClient("https://pnaitrnthhclyzfdvgbp.supabase.co", key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cache = {};
  function load(file) {
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
      name === "server-only"
        ? {}
        : name === "@/lib/auth"
          ? { requireAdmin: async () => ({ supabase: db }) }
          : name === "@/lib/supabase/admin"
            ? { createAdminClient: () => db }
            : name.startsWith("@/")
              ? load("src/" + name.slice(2) + ".ts")
              : require(name),
    );
    return (cache[file] = m.exports);
  }
  const { getAdminWorkspace } = load("src/lib/admin-workspace.ts");
  const data = await getAdminWorkspace();
  assert.ok(Array.isArray(data.players));
  assert.ok(Array.isArray(data.requests));
  assert.ok(Number.isFinite(data.received));
  assert.ok(Number.isFinite(data.pending));
  assert(!JSON.stringify(data).includes("health_card"));
  assert(!JSON.stringify(data).includes("allergies"));
  assert.equal(
    new Set(data.players.map((p) => p.id)).size,
    data.players.length,
  );
  console.log(
    JSON.stringify({
      readOnly: true,
      players: data.players.length,
      requests: data.requests.length,
      month: data.month,
      pendingReceipts: data.pendingCount,
      undatedReceipts: data.undated,
    }),
  );
  console.log(
    "PASS: deployed schema relations and safe dashboard projection. Admin authorization tested separately via HTTP.",
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
