import { CalendarWidget } from '../dashboard/components/calendar-widget'

export const dynamic = 'force-dynamic'

export default function AdminCalendarPage() {
    return (
        <div className="w-full h-full pb-8">
            <CalendarWidget initialView="list" />
        </div>
    )
}
