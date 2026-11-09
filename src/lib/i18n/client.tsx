'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createTranslator, localeCookie, type Locale } from './translate'

const LocaleContext = createContext<Locale>('es')
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}
export function useLocale() { return useContext(LocaleContext) }
export function useT() {
  const locale = useContext(LocaleContext)
  return useMemo(() => createTranslator(locale), [locale])
}
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useContext(LocaleContext)
  function changeLanguage(next: Locale) {
    if (next === locale) return
    // Preference persistence is an intentional browser side effect of this click.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
    // Reload the current URL so server-rendered text and metadata use the same locale.
    window.location.reload()
  }
  return <div role="group" aria-label="Idioma" className={`inline-flex shrink-0 rounded-lg border border-white/25 bg-navy p-0.5 text-xs font-bold ${compact ? 'flex-col' : ''}`}>
    {(['es', 'ca'] as const).map(value => <button key={value} type="button" lang={value} aria-label={value === 'es' ? 'Castellano' : 'Català'} aria-pressed={locale === value} onClick={() => changeLanguage(value)} className={`min-h-10 min-w-10 rounded-md px-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${locale === value ? 'bg-gold text-navy' : 'text-white hover:bg-white/10'}`}>{value.toUpperCase()}</button>)}
  </div>
}
