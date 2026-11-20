export function attendanceSummary(rows: {attendance: string | null; session_date: string}[], today: string) {
    const completed = rows.filter(row => row.session_date <= today && ['present','absent','excused'].includes(row.attendance || ''))
    const present = completed.filter(row=>row.attendance==='present').length
    const absent = completed.filter(row=>row.attendance==='absent').length
    const excused = completed.filter(row=>row.attendance==='excused').length
    return { total: completed.length, present, absent, excused, percentage: completed.length ? Math.round(present/completed.length*100) : null }
}
