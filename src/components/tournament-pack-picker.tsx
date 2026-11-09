'use client'

import { christmasTournaments, tournamentQuote } from '@/lib/christmas-tournaments'
import { useT } from '@/lib/i18n/client'

type Props = {
  selected: string[]
  category: string
  ownsKit: boolean
  onChange: (ids: string[]) => void
}
const button = 'min-h-11 rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600'
const allIds = christmasTournaments.map(t => t.id)

export function TournamentPackPicker({ selected, category, ownsKit, onChange }: Props) {
  const t = useT()
  const canChooseThree = !category || christmasTournaments.every(event => (event.categories as readonly string[]).includes(category))
  const savings = selected.length ? selected.length * tournamentQuote([allIds[0]], true).tournaments - tournamentQuote(selected, true).tournaments : 0
  return <>
    <p className="text-xl font-black">{t('Más fútbol. Más ahorro.')}</p>
    <p className="mt-2 text-sm text-slate-600">{t('Combina torneos y el descuento se aplica automáticamente.')}</p>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[1, 2, 3].map(count => {
        const price = tournamentQuote(allIds.slice(0, count), true).tournaments
        const saving = count * 65 - price
        const active = selected.length === count
        return <div key={count} className={`flex min-w-0 flex-col rounded-2xl border p-3 sm:p-4 ${count === 3 ? 'col-span-2 border-gold bg-amber-50 sm:col-span-1' : 'bg-white'} ${active ? 'ring-2 ring-navy ring-offset-2' : ''}`}>
          <p className={`mb-2 text-xs font-bold ${count === 3 ? 'text-amber-800' : 'text-slate-500'}`}>{t(count === 3 ? 'MÁXIMO AHORRO' : count === 2 ? 'COMBINA Y AHORRA' : 'A TU RITMO')}</p>
          <h3 className="font-bold">{t(count === 1 ? '1 torneo' : count === 2 ? '2 torneos' : 'Pack de 3 torneos')}</h3>
          <p className="mt-3 text-3xl font-black">{price} €</p>
          <p className="mt-1 text-sm text-slate-600">{price / count} € {t('/ torneo')}</p>
          <p className="mt-3 break-words text-xs sm:text-sm font-bold text-emerald-800">{saving > 0 ? <>{t('Ahorras')} {saving} € <span className="ml-1 font-normal text-slate-500"><s>{count * 65} €</s></span></> : t('Precio individual')}</p>
          {count === 3 && <button type="button" aria-pressed={active} disabled={!canChooseThree || active} onClick={() => onChange([...allIds])} className={`${button} mt-4 bg-navy text-white hover:bg-navy-light disabled:opacity-60`}>{t(active ? 'Pack de 3 seleccionado' : 'Elegir los 3 torneos')}</button>}
          {count === 3 && !canChooseThree && <p className="mt-2 text-xs text-slate-600">{t('Disponible para S9, S10, S11 y S12.')}</p>}
          {active && count !== 3 && <p className="mt-3 text-xs font-bold">{t('Tu selección actual')}</p>}
        </div>
      })}
    </div>
    <p className="mb-5 mt-4 text-xs leading-relaxed text-slate-600">{t('Precios por jugador. Ahorro frente a torneos sueltos de 65 €. Equipación aparte si la necesitas (+55 €). Academy validará categoría, fechas y disponibilidad.')}</p>
    <p className="mb-3 font-bold">{t('Marca los torneos que quieres jugar')}</p>
    <div className="space-y-3">{christmasTournaments.map(event => {
      const checked = selected.includes(event.id)
      const available = !category || (event.categories as readonly string[]).includes(category)
      return <label key={event.id} className={`flex gap-3 rounded-xl border p-4 ${!available ? 'bg-slate-100 text-slate-500' : checked ? 'cursor-pointer border-navy bg-blue-50' : 'cursor-pointer bg-white'}`}>
        <input type="checkbox" checked={checked} disabled={!available} onChange={e => onChange(e.target.checked ? [...selected, event.id] : selected.filter(id => id !== event.id))} className="mt-1 h-5 w-5 shrink-0 accent-[#102542]" />
        <span className="min-w-0 break-words"><strong>{event.name}</strong><span className="mt-1 block text-sm text-slate-600">{t(event.date)} · {event.categories.join(', ')}</span>{!available && <span className="mt-1 block text-xs">{t('No disponible para la categoría seleccionada.')}</span>}</span>
      </label>
    })}</div>
    <p aria-live="polite" className="mt-4 rounded-xl bg-slate-100 p-4 text-sm font-semibold">{selected.length ? <>{t('Torneos:')} {tournamentQuote(selected, ownsKit).tournaments} €{savings > 0 && <span className="ml-2 text-emerald-800">· {t('Ahorras')} {savings} €</span>}</> : t('Selecciona al menos un torneo para ver tu total.')}</p>
  </>
}

export function TournamentPackUpgrade({ selected, category, ownsKit, onChange }: Props) {
  const t = useT()
  if (!selected.length || selected.length === 3) return null
  const available = christmasTournaments.filter(event => !category || (event.categories as readonly string[]).includes(category))
  const missing = available.filter(event => !selected.includes(event.id))
  if (!missing.length) return null
  const current = tournamentQuote(selected, ownsKit)
  const targetIds = available.length === 3 ? [...allIds] : [...selected, missing[0].id]
  const target = tournamentQuote(targetIds, ownsKit)
  const saving = targetIds.length * 65 - target.tournaments
  return <aside className="mt-5 rounded-xl border border-gold/50 bg-white p-5 text-navy">
    <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{t('Aprovecha el precio de pack')}</p>
    <h3 className="mt-2 text-xl font-black">{t(targetIds.length === 3 ? 'Juega los 3 y ahorra 30 €' : 'Juega 2 y ahorra 10 €')}</h3>
    <p className="mt-2 text-sm">{t('Amplía tu selección por')} <strong>{target.total - current.total} € {t('más')}</strong>. {t('Torneos:')} {target.tournaments} € · {target.tournaments / targetIds.length} € {t('/ torneo')}.</p>
    <p className="mt-2 text-xs text-slate-600">{t('Total con tu opción de equipación:')} {target.total} €. {t('Ahorro en torneos:')} {saving} €.</p>
    <button type="button" onClick={() => onChange(targetIds)} className={`${button} mt-4 w-full bg-gold text-navy hover:bg-gold-light`}>{t(targetIds.length === 3 ? 'Cambiar al pack de 3' : 'Añadir el segundo torneo')}</button>
    {selected.length === 1 && available.length === 3 && <details className="mt-4 text-sm">
      <summary className="cursor-pointer py-2 font-semibold underline">{t('¿Prefieres 2? Elige otro y ahorra 10 €')}</summary>
      <div className="mt-2 flex flex-col gap-2">{missing.map(event => <button key={event.id} type="button" onClick={() => onChange([...selected, event.id])} className={`${button} border border-slate-300 text-left hover:bg-slate-50`}>{t('Añadir')} {event.name} · +{tournamentQuote([...selected, event.id], ownsKit).total - current.total} €</button>)}</div>
    </details>}
    <p className="mt-3 text-xs text-slate-600">{t('Sujeto a validación de categoría, fechas y disponibilidad. Puedes ajustar tu selección antes de enviar.')}</p>
  </aside>
}
