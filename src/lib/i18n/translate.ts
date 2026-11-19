import ca from './ca.json'
import en from './en.json'

export type Locale = 'es' | 'ca' | 'en'
export const localeCookie = 'academy_locale'
export function parseLocale(value?: string): Locale { return value === 'ca' || value === 'en' ? value : 'es' }
const catalogues: Record<'ca' | 'en', Record<string, string>> = { ca, en }
// Only match complete, explicitly catalogued messages. Captured names, amounts,
// URLs and IDs are inserted verbatim; arbitrary family content is not translated.
function buildTemplates(messages: Record<string, string>) { return Object.entries(messages).filter(([key]) => /\{\w+\}/.test(key)).map(([source, target]) => {
  const names: string[] = []
  const pattern = source.split(/(\{\w+\})/).map(part => {
    const parameter = /^\{(\w+)\}$/.exec(part)
    if (!parameter) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    names.push(parameter[1])
    return ['count', 'months', 'amount'].includes(parameter[1]) ? '([\\d.,]+)' : '(.+?)'
  }).join('')
  return { expression: new RegExp(`^${pattern}$`), names, target }
}) }
const templates = { ca: buildTemplates(ca), en: buildTemplates(en) }
const months: Record<string, string> = { enero: 'gener', febrero: 'febrer', marzo: 'març', abril: 'abril', mayo: 'maig', junio: 'juny', julio: 'juliol', agosto: 'agost', septiembre: 'setembre', octubre: 'octubre', noviembre: 'novembre', diciembre: 'desembre' }

/** Translate presentation text only. Form values, URLs and stored records stay unchanged. */
export function createTranslator(locale: Locale) {
  const messages = locale === 'es' ? {} : catalogues[locale]
  const messageTemplates = locale === 'es' ? [] : templates[locale]
  function t<T>(value: T): T {
    if (locale === 'es' || typeof value !== 'string') return value
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
      if (locale === 'en') {
        const englishMonths: Record<string, string> = { enero: 'January', febrero: 'February', marzo: 'March', abril: 'April', mayo: 'May', junio: 'June', julio: 'July', agosto: 'August', septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December' }
        return value.replace(/(\d{1,2}) de ([a-z]+)(?: de (\d{4}))?/g, (date, day, month, year) => englishMonths[month] ? `${day} ${englishMonths[month]}${year ? ` ${year}` : ''}` : date) as T
      }
      return value.replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/g, month => months[month]) as T
    }
    return value
  }
  return Object.assign(t, { locale: locale === 'ca' ? 'ca-ES' : locale === 'en' ? 'en-GB' : 'es-ES' })
}

export function translateMetadata<T>(value: T, translate: ReturnType<typeof createTranslator>): T {
  if (typeof value === 'string') return translate(value)
  if (Array.isArray(value)) return value.map(item => translateMetadata(item, translate)) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateMetadata(item, translate)])) as T
  return value
}
