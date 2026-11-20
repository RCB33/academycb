'use client'

import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import { useLocale } from '@/lib/i18n/client'
import { usePwa } from './pwa-provider'

export function InstallApp() {
  const locale = useLocale()
  const { installed, ios, prompt, clearPrompt } = usePwa()
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)
  const text = {
    es: { title: 'Academy en tu móvil', body: 'Añádela a tu pantalla de inicio para abrir el portal con un toque.', button: 'Instalar Academy', help: 'Cómo instalar la app', ios: 'En Safari, pulsa Compartir y después «Añadir a pantalla de inicio». Si aparece «Abrir como app web», déjalo activado.', other: 'Abre el menú de tu navegador y busca «Instalar aplicación» o «Añadir a pantalla de inicio». Si no aparece, abre esta página en Chrome o Safari.', note: 'Necesitas conexión a internet para consultar y guardar tus datos.' },
    ca: { title: 'Academy al teu mòbil', body: 'Afegeix-la a la pantalla d’inici per obrir el portal amb un toc.', button: 'Instal·lar Academy', help: 'Com instal·lar l’app', ios: 'A Safari, prem Compartir i després «Afegir a la pantalla d’inici». Si apareix «Obrir com a app web», deixa-ho activat.', other: 'Obre el menú del navegador i busca «Instal·lar aplicació» o «Afegir a la pantalla d’inici». Si no apareix, obre aquesta pàgina a Chrome o Safari.', note: 'Necessites connexió a internet per consultar i desar les dades.' },
    en: { title: 'Academy on your phone', body: 'Add it to your home screen to open your portal with one tap.', button: 'Install Academy', help: 'How to install the app', ios: 'In Safari, tap Share, then “Add to Home Screen”. If “Open as Web App” appears, leave it enabled.', other: 'Open your browser menu and look for “Install app” or “Add to Home Screen”. If unavailable, open this page in Chrome or Safari.', note: 'An internet connection is required to view and save your data.' },
  }[locale]
  if (installed) return null
  async function install() {
    if (!prompt || busy) return
    setBusy(true)
    try { await prompt.prompt(); await prompt.userChoice } catch { setHelp(true) }
    finally { clearPrompt(); setBusy(false) }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-navy shadow-sm" aria-label={text.title}>
    <div className="flex items-center gap-3"><Smartphone aria-hidden="true" className="h-6 w-6 shrink-0 text-gold"/><h2 className="text-lg font-bold">{text.title}</h2></div>
    <p className="mt-2 text-base text-slate-600">{text.body}</p>
    <button type="button" disabled={busy} onClick={prompt ? install : () => setHelp(!help)} aria-expanded={prompt ? undefined : help} className="mt-3 min-h-11 rounded-xl bg-gold px-4 py-2 text-base font-bold disabled:opacity-60">{prompt ? text.button : text.help}</button>
    {help && <div className="mt-3 space-y-2 text-base"><p>{ios ? text.ios : text.other}</p><p className="text-slate-600">{text.note}</p></div>}
  </section>
}
