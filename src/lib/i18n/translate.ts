import ca from './ca.json'

export type Locale = 'es' | 'ca'
export const localeCookie = 'academy_locale'
export function parseLocale(value?: string): Locale { return value === 'ca' ? 'ca' : 'es' }
const messages: Record<string, string> = ca
// Only match complete, explicitly catalogued messages. Captured names, amounts,
// URLs and IDs are inserted verbatim; arbitrary family content is not translated.
const messageTemplates = Object.entries(messages).filter(([key]) => /\{\w+\}/.test(key)).map(([source, target]) => {
  const names: string[] = []
  const pattern = source.split(/(\{\w+\})/).map(part => {
    const parameter = /^\{(\w+)\}$/.exec(part)
    if (!parameter) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    names.push(parameter[1])
    return ['count', 'months', 'amount'].includes(parameter[1]) ? '([\\d.,]+)' : '(.+?)'
  }).join('')
  return { expression: new RegExp(`^${pattern}$`), names, target }
})
const months: Record<string, string> = { enero: 'gener', febrero: 'febrer', marzo: 'març', abril: 'abril', mayo: 'maig', junio: 'juny', julio: 'juliol', agosto: 'agost', septiembre: 'setembre', octubre: 'octubre', noviembre: 'novembre', diciembre: 'desembre' }

/** Translate presentation text only. Form values, URLs and stored records stay unchanged. */
export function createTranslator(locale: Locale) {
  function t<T>(value: T): T {
    if (locale !== 'ca' || typeof value !== 'string') return value
    const key = value.replace(/\s+/g, ' ').trim()
    const translated = messages[key]
    if (translated !== undefined) {
      return (value.match(/^\s*/)?.[0] + translated + value.match(/\s*$/)?.[0]) as T
    }
    for (const template of messageTemplates) {
      const match = template.expression.exec(key)
      if (!match) continue
      const result = template.target.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
        const index = template.names.indexOf(name)
        return index < 0 ? placeholder : match[index + 1]
      })
      return (value.match(/^\s*/)?.[0] + result + value.match(/\s*$/)?.[0]) as T
    }
    if (/^\d{1,2} de [a-z]+(?: de \d{4})?(?: – \d{1,2} de [a-z]+(?: de \d{4})?)?$/.test(key)) {
      return value.replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/g, month => months[month]) as T
    }
    return value
  }
  return Object.assign(t, { locale: locale === 'ca' ? 'ca-ES' : 'es-ES' })
}

export function translateMetadata<T>(value: T, translate: ReturnType<typeof createTranslator>): T {
  if (typeof value === 'string') return translate(value)
  if (Array.isArray(value)) return value.map(item => translateMetadata(item, translate)) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateMetadata(item, translate)])) as T
  return value
}
