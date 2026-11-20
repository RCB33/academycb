'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale } from '@/lib/i18n/client'

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const PwaContext = createContext<{ installed: boolean; ios: boolean; prompt: InstallPrompt | null; clearPrompt(): void }>({ installed: false, ios: false, prompt: null, clearPrompt() {} })
export const usePwa = () => useContext(PwaContext)

export function PwaProvider({ children }: { children: ReactNode }) {
  const locale = useLocale()
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [offline, setOffline] = useState(false)
  const updating = useRef(false)
  const text = {
    es: { offline: 'Sin conexión. Conéctate antes de guardar o pagar.', update: 'Hay una nueva versión de Academy.', button: 'Actualizar ahora', hint: 'Termina de guardar tus cambios antes de actualizar.' },
    ca: { offline: 'Sense connexió. Connecta’t abans de desar o pagar.', update: 'Hi ha una nova versió d’Academy.', button: 'Actualitzar ara', hint: 'Acaba de desar els canvis abans d’actualitzar.' },
    en: { offline: 'Offline. Reconnect before saving or paying.', update: 'A new version of Academy is available.', button: 'Update now', hint: 'Finish saving your changes before updating.' },
  }[locale]

  useEffect(() => {
    let disposed = false
    const display = window.matchMedia('(display-mode: standalone)')
    const updateDisplay = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    const updateOnline = () => setOffline(!navigator.onLine)
    const installPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const installedEvent = () => { setInstalled(true); setPrompt(null) }
    Promise.resolve().then(() => {
      if (disposed) return
      updateDisplay(); updateOnline()
      setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    })
    display.addEventListener('change', updateDisplay)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    window.addEventListener('beforeinstallprompt', installPrompt)
    window.addEventListener('appinstalled', installedEvent)
    return () => {
      disposed = true
      display.removeEventListener('change', updateDisplay)
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
      window.removeEventListener('beforeinstallprompt', installPrompt)
      window.removeEventListener('appinstalled', installedEvent)
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    let disposed = false
    let registration: ServiceWorkerRegistration | undefined
    let lastCheck = 0
    const controllerChanged = () => { if (updating.current) window.location.reload() }
    const check = () => {
      if (!registration || document.visibilityState !== 'visible' || !navigator.onLine || Date.now() - lastCheck < 60 * 60 * 1000) return
      lastCheck = Date.now()
      void registration.update().catch(() => {})
    }
    const detectWaiting = () => {
      if (!disposed && registration?.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting)
    }
    navigator.serviceWorker.addEventListener('controllerchange', controllerChanged)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(reg => {
      if (disposed) return
      registration = reg
      detectWaiting()
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing
        worker?.addEventListener('statechange', detectWaiting)
      })
      check()
    }).catch(() => { /* Installation support must never block portal access. */ })
    return () => {
      disposed = true
      navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [])

  return <PwaContext.Provider value={{ installed, ios, prompt, clearPrompt: () => setPrompt(null) }}>
    {children}
    {(offline || waiting) && <aside aria-live="polite" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 text-base text-navy shadow-xl">
      {offline ? <p role="status">{text.offline}</p> : <><p className="font-bold">{text.update}</p><p className="mt-1 text-sm text-slate-600">{text.hint}</p><button type="button" onClick={() => { updating.current = true; waiting?.postMessage({ type: 'ACTIVATE_UPDATE' }) }} className="mt-3 min-h-11 rounded-lg bg-gold px-4 py-2 font-bold">{text.button}</button></>}
    </aside>}
  </PwaContext.Provider>
}
