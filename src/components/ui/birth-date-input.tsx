'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { useScopedDraftState } from '@/components/forms/form-draft'
import { useT } from '@/lib/i18n/client'

export function birthDateValue(year: string, month: string, day: string) {
    if (!year || !month || !day) return ''
    const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const date = new Date(`${value}T12:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : ''
}

type BirthDateProps = { name: string; defaultValue?: string; required?: boolean; readOnly?: boolean; min?: string; max?: string; persistDraft?: boolean }
type DatePart = [string, Dispatch<SetStateAction<string>>]

// Registration uses its existing draft provider; profile dialogs keep edits local until saved.
export function BirthDateInput(props: BirthDateProps) {
    return props.persistDraft === false ? <LocalBirthDateInput {...props} /> : <DraftBirthDateInput {...props} />
}
function DraftBirthDateInput(props: BirthDateProps) {
    const { name, defaultValue = '', readOnly = false } = props
    const year = useScopedDraftState(name + '_year', defaultValue.slice(0, 4), value => !readOnly || value === defaultValue.slice(0, 4))
    const month = useScopedDraftState(name + '_month', defaultValue.slice(5, 7), value => !readOnly || value === defaultValue.slice(5, 7))
    const day = useScopedDraftState(name + '_day', defaultValue.slice(8, 10), value => !readOnly || value === defaultValue.slice(8, 10))
    return <BirthDateFields {...props} yearState={year} monthState={month} dayState={day} />
}
function LocalBirthDateInput(props: BirthDateProps) {
    const { defaultValue = '' } = props
    const year = useState(defaultValue.slice(0, 4))
    const month = useState(defaultValue.slice(5, 7))
    const day = useState(defaultValue.slice(8, 10))
    return <BirthDateFields {...props} yearState={year} monthState={month} dayState={day} />
}
function BirthDateFields({ name, required = true, readOnly = false, min = '1900-01-01', max, yearState: [year, setYear], monthState: [month, setMonth], dayState: [day, setDay] }: BirthDateProps & { yearState: DatePart; monthState: DatePart; dayState: DatePart }) {
    const t = useT()
    const lastYear = Number(max?.slice(0, 4) || new Date().getFullYear())
    const firstYear = Number(min.slice(0, 4))
    const days = year && month ? new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate() : 31
    const validDay = Number(day) <= days ? day : ''
    const value = birthDateValue(year, month, validDay)
    const requireComplete = required || Boolean(year || month || day)
    const cls = 'mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-2 text-base text-navy'
    return <fieldset className="min-w-0"><legend className="text-sm font-bold text-slate-700">{t('Fecha de nacimiento')}</legend>
        <input type="hidden" name={name} value={value} />
        <div className="mt-2 grid grid-cols-[1fr_1.5fr_1.2fr] gap-2">
            <label className="min-w-0 text-sm">{t('Día')}<select aria-label={t('Día de nacimiento')} required={requireComplete} disabled={readOnly} value={validDay} onChange={e => setDay(e.target.value)} className={cls}><option value="">{t('Día')}</option>{Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0')).map(d => <option key={d} value={d}>{Number(d)}</option>)}</select></label>
            <label className="min-w-0 text-sm">{t('Mes')}<select aria-label={t('Mes de nacimiento')} required={requireComplete} disabled={readOnly} value={month} onChange={e => setMonth(e.target.value)} className={cls}><option value="">{t('Mes')}</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{new Date(2020, i, 1).toLocaleDateString(t.locale, { month: 'long' })}</option>)}</select></label>
            <label className="min-w-0 text-sm">{t('Año')}<select aria-label={t('Año de nacimiento')} required={requireComplete} disabled={readOnly} value={year} onChange={e => setYear(e.target.value)} className={cls}><option value="">{t('Año')}</option>{Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i).map(y => <option key={y} value={y}>{y}</option>)}</select></label>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('Completa día, mes y año.')}</p>
    </fieldset>
}
