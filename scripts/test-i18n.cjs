const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { createRequire } = require('node:module')
const filename = path.resolve('src/lib/i18n/translate.ts')
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
const loaded = { exports: {} }
new Function('require', 'module', 'exports', output)(createRequire(filename), loaded, loaded.exports)
const { createTranslator, parseLocale, translateMetadata } = loaded.exports
const ca = createTranslator('ca'), es = createTranslator('es')
assert.equal(parseLocale('ca'), 'ca')
assert.equal(parseLocale('en'), 'es')
assert.equal(parseLocale(), 'es')
assert.equal(ca('  Solicitar plaza '), '  Sol·licitar plaça ')
assert.equal(es('Solicitar plaza'), 'Solicitar plaza')
assert.equal(ca('2 de enero – 3 de enero'), '2 de gener – 3 de gener')
assert.equal(ca('197 €'), '197 €')
assert.equal(ca(197), 197)
assert.equal(ca(null), null)
const record = { name: 'Ana', price: 197 }
assert.equal(ca(record), record, 'Do not mutate records or React element props')
assert.equal(ca('Jugador inventado 123'), 'Jugador inventado 123')
const metadata = { title: 'Torneos Academy', alternates: { canonical: '/torneos' } }
assert.deepEqual(translateMetadata(metadata, ca), { title: 'Tornejos Academy', alternates: { canonical: '/torneos' } })
assert.equal(metadata.title, 'Torneos Academy')
const messages = JSON.parse(fs.readFileSync('src/lib/i18n/ca.json', 'utf8'))
for (const [source, translation] of Object.entries(messages)) {
  assert.ok(translation.trim(), `Empty translation: ${source}`)
  const numbers = text => (text.match(/\d+(?:[.,]\d+)*/g) || []).sort()
  assert.deepEqual(numbers(translation), numbers(source), `Changed numbers: ${source}`)
}
console.log(`i18n: locale fallback, dates, whitespace, metadata, data preservation and ${Object.keys(messages).length} numeric consistency checks passed`)
