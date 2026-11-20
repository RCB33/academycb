const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
// Exercise the actual component handlers with delayed/blocked navigation.
// No browser, passwords, emails or Auth services are used.
let slots = [], cursor = 0, effects = [], posts = 0, navigation
const hooks = {
  useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v }] },
  useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i] },
  useMemo(fn) { const i = cursor++; if (!(i in slots)) slots[i] = fn(); return slots[i] },
  useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, n) => v !== slots[i][n])) { slots[i] = deps; effects.push(fn) } },
}
global.fetch = async (_url, options) => ({ ok: true, json: async () => { if (options?.method === 'POST') { posts++; return { success: true, next: '/portal/dashboard' } } return { step: 'password', email: 'family@example.invalid' } } })
global.sessionStorage = { removeItem() {}, getItem() { return null } }
global.window = { setTimeout(fn) { navigation = fn; return 1 }, clearTimeout() {}, location: { assign() { throw new Error('Mobile navigation blocked') } } }
const moduleUnderTest = { exports: {} }
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('src/app/portal/codigo/email-code-form.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(moduleUnderTest, moduleUnderTest.exports, name => {
  if (name === 'react') return hooks
  if (name === 'react/jsx-runtime') return require(name)
  if (name === '@/lib/i18n/client') return { useLocale: () => 'es', LanguageSwitcher: 'languages' }
  if (name === '@/lib/supabase/recovery-client') return { createRecoveryClient: () => ({}) }
  return new Proxy({}, { get: (_target, property) => String(property) })
})
function render() { cursor = 0; const tree = moduleUnderTest.exports.EmailCodeForm({ initialType: 'recovery' }); for (const effect of effects.splice(0)) effect(); return tree }
function find(node, predicate) { if (!node || typeof node !== 'object') return null; if (predicate(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found } return null }
;(async () => {
  render(); await new Promise(resolve => setImmediate(resolve))
  let tree = render()
  find(tree, n => n.props?.id === 'new-password').props.onChange({ target: { value: 'Fixture-password-99' } })
  find(tree, n => n.props?.id === 'confirm-password').props.onChange({ target: { value: 'Fixture-password-99' } })
  tree = render()
  const submit = find(tree, n => n.type === 'form').props.onSubmit
  await submit({ preventDefault() {} })
  tree = render()
  assert.equal(posts, 1)
  assert(!find(tree, n => n.type === 'form'), 'Saved passwords cannot be submitted again')
  assert(find(tree, n => n.type === 'h2' && n.props.children === 'Contraseña guardada'))
  assert(find(tree, n => n.type === 'a' && n.props.href === '/portal/dashboard'), 'A normal navigation link remains available')
  await submit({ preventDefault() {} })
  assert.equal(posts, 1, 'A stale form handler/double tap cannot repeat the consumed verification')
  assert.doesNotThrow(() => navigation())
  tree = render()
  assert(find(tree, n => n.type === 'h2' && n.props.children === 'Contraseña guardada'), 'Navigation failure cannot become a password error')
  assert(!slots.includes('Fixture-password-99'), 'Passwords cleared after completion')
  console.log('PASS: saved confirmation, cleared password, blocked duplicate submission and usable link after mobile navigation failure. Mock UI only.')
})().catch(error => { console.error(error); process.exitCode = 1 })
