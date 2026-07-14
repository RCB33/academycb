import { existsSync, readFileSync } from 'node:fs'

function loadLocalEnv() {
  if (!existsSync('.env.local')) return
  for (const rawLine of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadLocalEnv()

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
]
const errors = []

for (const key of required) {
  if (!process.env[key]) errors.push(`Falta ${key}`)
}

for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SITE_URL']) {
  const value = process.env[key]
  if (!value) continue
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') errors.push(`${key} debe usar HTTPS en producción`)
    if (url.pathname !== '/' || url.search || url.hash) errors.push(`${key} debe ser solo el origen, sin ruta, parámetros ni fragmento`)
  } catch {
    errors.push(`${key} no es una URL válida`)
  }
}

if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY) {
  errors.push('La clave anónima y la service role no pueden ser la misma')
}

if (errors.length) {
  console.error('Comprobación de producción fallida:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Configuración de producción válida (sin mostrar secretos).')
