"use client"

import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { es } from "date-fns/locale"

interface DashboardCalendarProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    events: any[]
}

export function DashboardCalendar({ date, setDate, events }: DashboardCalendarProps) {

    // Helper to get events for a specific day
    const getEventsForDay = (day: Date) => {
        return events.filter(event => {
            const eventDate = new Date(event.start_date)
            return eventDate.getDate() === day.getDate() &&
                eventDate.getMonth() === day.getMonth() &&
                eventDate.getFullYear() === day.getFullYear()
        })
    }

    return (
        <Card className="h-full border-none shadow-none bg-white rounded-xl overflow-hidden">
            <CardContent className="p-4 h-full">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={es}
                    className="p-0 w-full h-full"
                    classNames={{
                        months: "flex flex-col w-full h-full",
                        month: "flex flex-col w-full h-full",
                        caption: "flex justify-between items-center mb-4 px-2",
                        caption_label: "text-2xl font-bold capitalize text-navy tracking-tight",
                        nav: "flex items-center gap-1",
                        table: "w-full h-full border-collapse",
                        head_row: "grid grid-cols-7 mb-2",
                        head_cell: "text-muted-foreground font-bold text-xs uppercase tracking-wider text-center",
                        row: "grid grid-cols-7 w-full flex-1 min-h-[80px]", // Minimum height for "planner" feel
                        cell: "border border-slate-100 p-0 relative focus-within:relative focus-within:z-20 min-h-[80px]",
                        day: "w-full h-full p-2 font-normal aria-selected:opacity-100 items-start justify-start text-left hover:bg-slate-50 transition-colors flex flex-col gap-1",
                        day_selected: "bg-blue-50/50 text-navy border-2 border-primary z-10",
                        day_today: "bg-slate-50 font-bold",
                        day_outside: "opacity-30 bg-slate-50/30",
                        day_disabled: "opacity-50",
                        day_hidden: "invisible",
                    }}
                    components={{
                        // @ts-ignore
                        DayContent: (props) => {
                            const dayEvents = getEventsForDay(props.date);
                            const isSelected = date && date.toDateString() === props.date.toDateString();
                            const isToday = new Date().toDateString() === props.date.toDateString();

                            return (
                                <div className="w-full h-full flex flex-col items-start justify-start pt-1 pl-1">
                                    <span className={`text-sm ${isToday ? 'bg-navy text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-500'}`}>
                                        {props.date.getDate()}
                                    </span>

                                    {/* Event Bars */}
                                    <div className="w-full flex flex-col gap-1 mt-1 pr-1">
                                        {dayEvents.slice(0, 3).map((ev, i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 w-full rounded-full ${ev.color === 'red' ? 'bg-red-500' :
                                                        ev.color === 'green' ? 'bg-green-500' :
                                                            ev.color === 'yellow' ? 'bg-yellow-500' :
                                                                'bg-blue-500'
                                                    }`}
                                                title={ev.title}
                                            />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className="text-[9px] text-gray-400 pl-1">+{dayEvents.length - 3} más</span>
                                        )}
                                    </div>
                                </div>
                            )
                        }
                    }}
                />
            </CardContent>
        </Card>
    )
}
