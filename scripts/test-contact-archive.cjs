const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const id = '11111111-1111-4111-8111-111111111111'
let authorized, dbError, visible, record, updates, paths
function reset() {
    authorized = true; dbError = false; visible = true; updates = []; paths = []
    record = { id, name: 'Consulta de prueba', email: 'test@example.invalid', phone: null, message: 'Mensaje de prueba que se conserva', created_at: '2026-11-21T12:00:00Z', status: 'new' }
}
const db = { from(table) {
    assert.equal(table, 'contact_messages')
    let values
    const query = {
        update(input) { values = input; return query },
        eq(column, value) { assert.equal(column, 'id'); assert.equal(value, id); return query },
        select(columns) { assert.equal(columns, 'id,status'); return query },
        async maybeSingle() {
            if (dbError) return { data: null, error: { message: 'private database error' } }
            if (!visible) return { data: null, error: null }
            updates.push(values); Object.assign(record, values)
            return { data: { id, status: record.status }, error: null }
        },
    }
    return query
} }
function load(file, overrides = {}) {
    const module = { exports: {} }
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('module', 'exports', 'require', source)(module, module.exports, name => {
        if (name in overrides) return overrides[name]
        if (!name.startsWith('@/') && !name.startsWith('.')) return require(name)
        const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(file), name)
        return load(base + (fs.existsSync(base + '.ts') ? '.ts' : '.tsx'), overrides)
    })
    return module.exports
}
const { setContactArchived: save } = load('src/app/actions/contact-messages.ts', {
    '@/lib/auth': { requireAdmin: async () => { if (!authorized) throw Error('Forbidden'); return { supabase: db } } },
    'next/cache': { revalidatePath: value => paths.push(value) },
})
async function run() {
    reset(); const original = { ...record }
    assert.equal((await save(id, true)).success, true)
    assert.deepEqual(updates, [{ status: 'closed' }])
    assert.deepEqual(record, { ...original, status: 'closed' })
    assert.ok(paths.includes('/admin/leads'))
    assert.equal((await save(id, false)).success, true)
    assert.deepEqual(record, original)
    for (const args of [['not-id', true], [id, 'true'], [id, null]]) { reset(); assert.equal((await save(...args)).success, false); assert.equal(updates.length, 0) }
    reset(); authorized = false; await assert.rejects(save(id, true), /Forbidden/); assert.equal(updates.length, 0)
    reset(); visible = false; assert.equal((await save(id, true)).success, false); assert.equal(paths.length, 0)
    reset(); dbError = true; const failure = await save(id, true); assert.equal(failure.success, false); assert.ok(!failure.error.includes('private')); assert.equal(paths.length, 0)
    reset()
    const { ContactMessageInbox } = load('src/components/admin/contact-message-inbox.tsx', { '@/app/actions/contact-messages': { setContactArchived: save } })
    const props = { contacts: [record, { ...record, id: 'closed-id', name: 'Consulta archivada oculta', status: 'closed' }], canManage: true, loadError: false, onStatusChanged() {} }
    const html = renderToStaticMarkup(React.createElement(ContactMessageInbox, props))
    assert.match(html, /Archivar consulta/)
    assert.match(html, /Activas \(1\)/)
    assert.match(html, /Archivadas \(1\)/)
    assert.ok(html.includes(record.name))
    assert.ok(!html.includes('Consulta archivada oculta'))
    assert.ok(!renderToStaticMarkup(React.createElement(ContactMessageInbox, { ...props, canManage: false })).includes('Archivar consulta'))
    assert.match(renderToStaticMarkup(React.createElement(ContactMessageInbox, { ...props, loadError: true })), /No se pudieron cargar/)
    console.log('PASS: scoped reversible contact archive, input/admin guard, missing rows/errors, preserved message, active-only inbox and visible action. Mock writes only.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
