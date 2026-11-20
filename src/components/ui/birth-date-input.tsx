'use client'

import { useScopedDraftState } from '@/components/forms/form-draft'
import { useT } from '@/lib/i18n/client'

export function birthDateValue(year: string, month: string, day: string) {
    if (!year || !month || !day) return ''
    const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const date = new Date(`${value}T12:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : ''
}

export function BirthDateInput({ name, defaultValue = '', required = true, readOnly = false, min = '1900-01-01', max }: { name: string; defaultValue?: string; required?: boolean; readOnly?: boolean; min?: string; max?: string }) {
    const t = useT()
    const [year, setYear] = useScopedDraftState(name + '_year', defaultValue.slice(0, 4), value => !readOnly || value === defaultValue.slice(0, 4))
    const [month, setMonth] = useScopedDraftState(name + '_month', defaultValue.slice(5, 7), value => !readOnly || value === defaultValue.slice(5, 7))
    const [day, setDay] = useScopedDraftState(name + '_day', defaultValue.slice(8, 10), value => !readOnly || value === defaultValue.slice(8, 10))
    const lastYear = Number(max?.slice(0, 4) || new Date().getFullYear())
    const firstYear = Number(min.slice(0, 4))
    const days = year && month ? new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate() : 31
    const validDay = Number(day) <= days ? day : ''
    const value = birthDateValue(year, month, validDay)
    const cls = 'mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-2 text-base text-navy'
    return <fieldset className="min-w-0"><legend className="text-sm font-bold text-slate-700">{t('Fecha de nacimiento')}</legend>
        <input type="hidden" name={name} value={value} />
        <div className="mt-2 grid grid-cols-[1fr_1.5fr_1.2fr] gap-2">
            <label className="min-w-0 text-sm">{t('Día')}<select aria-label={t('Día de nacimiento')} required={required} disabled={readOnly} value={validDay} onChange={e => setDay(e.target.value)} className={cls}><option value="">{t('Día')}</option>{Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0')).map(d => <option key={d} value={d}>{Number(d)}</option>)}</select></label>
            <label className="min-w-0 text-sm">{t('Mes')}<select aria-label={t('Mes de nacimiento')} required={required} disabled={readOnly} value={month} onChange={e => setMonth(e.target.value)} className={cls}><option value="">{t('Mes')}</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{new Date(2020, i, 1).toLocaleDateString(t.locale, { month: 'long' })}</option>)}</select></label>
            <label className="min-w-0 text-sm">{t('Año')}<select aria-label={t('Año de nacimiento')} required={required} disabled={readOnly} value={year} onChange={e => setYear(e.target.value)} className={cls}><option value="">{t('Año')}</option>{Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i).map(y => <option key={y} value={y}>{y}</option>)}</select></label>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('Completa día, mes y año.')}</p>
    </fieldset>
}
