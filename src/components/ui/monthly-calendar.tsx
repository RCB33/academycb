'use client'

import { useState } from 'react'
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface CalendarEvent {
    id: string
    title: string
    start_date: string // ISO
    end_date: string   // ISO
    color?: string
    location?: string
    category_name?: string
    worker_name?: string
}

interface MonthlyCalendarProps {
    events: CalendarEvent[]
    onDateClick?: (date: Date) => void
    onEventClick?: (event: CalendarEvent) => void
}

export function MonthlyCalendar({ events, onDateClick, onEventClick }: MonthlyCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-navy capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    }

    const renderDays = () => {
        const days = []
        const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 }) // Monday

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-center font-semibold text-sm text-slate-500 py-2 capitalize">
                    {format(addDays(startDate, i), 'EEEE', { locale: es }).slice(0, 3)}
                </div>
            )
        }
        return <div className="grid grid-cols-7 mb-2">{days}</div>
    }

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

        const rows = []
        let days = []
        let day = startDate
        let formattedDate = ''

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd')
                const cloneDay = day

                // Find events for this day
                const dayEvents = events.filter(e => isSameDay(parseISO(e.start_date), cloneDay))

                days.push(
                    <div
                        key={day.toString()}
                        className={cn(
                            "min-h-[100px] md:min-h-[120px] p-1 md:p-2 border border-slate-100 bg-white transition-colors flex flex-col gap-1",
                            !isSameMonth(day, monthStart) && "bg-slate-50 text-slate-400 opacity-50",
                            onDateClick && "cursor-pointer hover:bg-slate-50",
                            isSameDay(day, new Date()) && "ring-2 ring-inset ring-gold/50 bg-gold/5"
                        )}
                        onClick={() => onDateClick && onDateClick(cloneDay)}
                    >
                        <div className="flex justify-end">
                            <span className={cn(
                                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                isSameDay(day, new Date()) ? "bg-navy text-white" : "text-slate-700"
                            )}>
                                {formattedDate}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 mt-1">
                            {dayEvents.map((evt) => (
                                <div
                                    key={evt.id}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEventClick && onEventClick(evt)
                                    }}
                                    className="text-white text-[10px] md:text-xs rounded-md px-1.5 py-1 truncate cursor-pointer hover:brightness-90 transition-all border-l-2 border-white/20"
                                    style={{ backgroundColor: evt.color || '#1e3a8a' }}
                                    title={evt.title}
                                >
                                    <div className="font-semibold truncate">{evt.title}</div>
                                    <div className="flex justify-between mt-0.5 opacity-90 truncate">
                                        <span className="truncate">{format(parseISO(evt.start_date), 'HH:mm')}</span>
                                        {evt.category_name && <span className="font-mono bg-black/20 px-1 rounded truncate ml-1">{evt.category_name}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
                day = addDays(day, 1)
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            )
            days = []
        }
        return <div className="border border-slate-100 rounded-lg overflow-hidden shadow-sm">{rows}</div>
    }

    return (
        <div className="w-full">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    )
}
