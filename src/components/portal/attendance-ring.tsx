import { getT } from '@/lib/i18n/server'
import type { attendanceSummary } from '@/lib/attendance-summary'
export async function AttendanceRing({summary}:{summary:ReturnType<typeof attendanceSummary>}) {
    const t=await getT(), {percentage,total,present,absent,excused}=summary
    return <section className="flex items-center gap-5 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:gap-8" aria-label={t('Asistencia a entrenamientos')}>
        <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={percentage===null?t('Sin registros de asistencia'):`${percentage}%`}><circle cx="60" cy="60" r="51" fill="none" stroke="#e2e8f0" strokeWidth="9"/>{percentage!==null&&percentage>0&&<circle cx="60" cy="60" r="51" fill="none" stroke="#059669" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${percentage||0} 100`} />}</svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl font-black text-navy">{percentage===null?'—':`${percentage}%`}</strong><span className="mt-1 text-[10px] font-bold uppercase text-slate-500">{t('Asistencia')}</span></div>
        </div>
        <div><h2 className="text-xl font-black text-navy">{t('Cada entreno cuenta')}</h2><p className="mt-2 text-sm text-slate-600">{t(total ? (absent===0&&excused===0?'¡No ha faltado a ningún entrenamiento registrado!':'Así va su asistencia a los entrenamientos.'):'Aún no hay asistencia registrada. El gráfico se actualizará cuando el entrenador pase lista.')}</p>{total>0&&<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold"><span className="text-emerald-700">{present} {t('asistencias')}</span><span className="text-rose-700">{absent} {t('ausencias')}</span><span className="text-slate-500">{excused} {t('justificadas')}</span></div>}</div>
    </section>
}
