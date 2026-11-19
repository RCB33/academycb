'use client'
import { useState } from 'react'
import { MonthlyCalendar, type CalendarEvent } from '@/components/ui/monthly-calendar'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useT } from '@/lib/i18n/client'

export function FamilyCalendar({ events }: { events: CalendarEvent[] }) {
    const t = useT()
    const [view, setView] = useState<'agenda' | 'month'>('agenda')
    const [selected, setSelected] = useState<CalendarEvent | null>(null)
    const [now] = useState(() => Date.now())
    const upcoming = events.filter(event => new Date(event.end_date).getTime() >= now)
    const date = (value: string) => new Date(value).toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })
    const time = (value: string) => new Date(value).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
    return <div className="space-y-4">
        <div role="group" aria-label={t('Vista del calendario')} className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">{(['agenda', 'month'] as const).map(value => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`min-h-11 rounded-lg px-5 text-sm font-bold ${view === value ? 'bg-navy text-white' : 'text-navy hover:bg-white'}`}>{t(value === 'agenda' ? 'Próximas actividades' : 'Ver por mes')}</button>)}</div>
        {view === 'month' ? <MonthlyCalendar events={events} onEventClick={setSelected} /> : upcoming.length ? <div className="space-y-3">{upcoming.map(event => <button key={event.id} type="button" onClick={() => setSelected(event)} className="block w-full rounded-xl border bg-white p-4 text-left hover:border-gold"><span className="block font-bold text-navy">{event.title}</span><span className="mt-1 block text-sm text-slate-600">{date(event.start_date)} · {event.is_all_day ? t('Todo el día') : time(event.start_date)}</span>{event.location && <span className="mt-1 block text-sm text-slate-600">{event.location}</span>}<span className="mt-2 block text-sm font-semibold text-navy underline">{t('Ver detalles')}</span></button>)}</div> : <p className="rounded-xl border border-dashed p-6 text-sm text-slate-600">{t('No hay actividades próximas publicadas para tu familia. Puedes consultar otros meses.')}</p>}
        <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}><DialogContent><DialogTitle className="pr-6">{selected?.title}</DialogTitle><DialogDescription>{t('Detalles de la actividad')}</DialogDescription>{selected && <dl className="space-y-4 text-sm"><div><dt className="font-bold">{t('Comienzo')}</dt><dd>{date(selected.start_date)} · {selected.is_all_day ? t('Todo el día') : time(selected.start_date)}</dd></div>{!selected.is_all_day && <div><dt className="font-bold">{t('Fin')}</dt><dd>{date(selected.end_date)} · {time(selected.end_date)}</dd></div>}<div><dt className="font-bold">{t('Lugar')}</dt><dd>{selected.location || t('Por confirmar')}</dd></div>{selected.category_name && <div><dt className="font-bold">{t('Equipo o categoría')}</dt><dd>{selected.category_name}</dd></div>}</dl>}</DialogContent></Dialog>
    </div>
}
