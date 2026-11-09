const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const m = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/stripe-return-origin.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports)
const { stripeReturnBase, STRIPE_PREVIEW_HOST } = m.exports
const alias = `https://${STRIPE_PREVIEW_HOST}`
const deployment = 'academycb-build123.vercel.app'
assert.equal(stripeReturnBase(alias, deployment), `${alias}/admin/stripe`)
assert.equal(stripeReturnBase(`https://${deployment}`, deployment), `https://${deployment}/admin/stripe`)
for (const origin of [null, '', 'null', 'https://evil.example', 'https://evil.vercel.app', `https://${STRIPE_PREVIEW_HOST}.evil.example`, `http://${STRIPE_PREVIEW_HOST}`, `${alias}:444`, `${alias}/evil`, `${alias}?next=evil`, `${alias}#evil`, `https://evil@${STRIPE_PREVIEW_HOST}`]) {
    assert.throws(() => stripeReturnBase(origin, deployment), String(origin))
}
console.log('PASS: same-origin preview return; external hosts, credentials, ports, paths and malformed origins rejected.')
