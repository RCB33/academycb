import { CalendarDays, Check, MapPin, UserRound, UsersRound } from 'lucide-react'
import { getT } from '@/lib/i18n/server'

export default async function AcademyStatsSection() {
    const translate = await getT()
    const cardClass = 'flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[.035] p-6 sm:p-8'

    return (
        <section id="academy-en-cifras" aria-labelledby="academy-stats-title" className="bg-navy pb-20 md:pb-28">
            <div className="container">
                <div className="rounded-[2rem] border border-gold/25 bg-gradient-to-br from-gold/[.08] via-navy-light/50 to-navy p-5 sm:p-8 lg:p-10">
                    <div className="mb-8 max-w-3xl md:mb-10">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{translate('Confianza, constancia y método')}</p>
                        <h2 id="academy-stats-title" className="mt-3 font-heading text-3xl font-black uppercase text-white sm:text-4xl md:text-5xl">{translate('Academy en cifras')}</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <article className={cardClass}>
                            <div aria-hidden="true" className="mb-6 grid h-24 max-w-52 grid-cols-5 items-center gap-2 text-gold">
                                {Array.from({ length: 10 }, (_, index) => <UsersRound key={index} className="h-7 w-7" />)}
                            </div>
                            <p className="font-heading text-5xl font-black tracking-tight text-gold">+100</p>
                            <h3 className="mt-3 text-lg font-bold text-white">{translate('Familias confían en nosotros')}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">{translate('Acompañamos a nuestros jugadores durante toda la temporada.')}</p>
                        </article>

                        <article className={cardClass}>
                            <div aria-hidden="true" className="mb-6 flex h-24 flex-col justify-center gap-3">
                                <CalendarDays className="h-7 w-7 text-gold" />
                                <div className="flex gap-1.5">{Array.from({ length: 7 }, (_, index) => <span key={index} className="h-8 min-w-0 flex-1 rounded-md border border-gold/40 bg-gold/20" />)}</div>
                            </div>
                            <p className="font-heading text-5xl font-black tracking-tight text-gold">{translate('7 días')}</p>
                            <h3 className="mt-3 text-lg font-bold text-white">{translate('De lunes a domingo')}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">{translate('Tecnificación a lo largo de toda la semana.')}</p>
                        </article>

                        <article className={cardClass}>
                            <div aria-hidden="true" className="mb-6 flex h-24 items-center gap-3 text-gold">
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10"><UserRound className="h-7 w-7" /></span>
                                <span className="h-px flex-1 bg-gold/40" />
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10"><UsersRound className="h-7 w-7" /></span>
                            </div>
                            <p className="font-heading text-3xl font-black uppercase leading-tight text-gold">{translate('Individual y colectivo')}</p>
                            <h3 className="mt-3 text-lg font-bold text-white">{translate('Entrenamientos de tecnificación')}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">{translate('Mejoramos la técnica del jugador y su juego en equipo.')}</p>
                        </article>

                        <article className={cardClass}>
                            <div aria-hidden="true" className="mb-6 flex h-24 items-center">
                                <span className="flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-gold bg-gold/10 outline-1 outline-offset-4 outline-gold/20"><Check className="h-10 w-10 text-gold" /></span>
                            </div>
                            <p className="font-heading text-5xl font-black tracking-tight text-gold">360º</p>
                            <h3 className="mt-3 text-lg font-bold text-white">{translate('Metodología 100% probada')}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">{translate('Desarrollo técnico, táctico, físico y socioafectivo.')}</p>
                        </article>
                    </div>

                    <div className="mt-6 flex items-start gap-4 rounded-2xl border border-gold/20 bg-gold/[.06] p-5 sm:items-center sm:p-6">
                        <MapPin aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-gold sm:mt-0" />
                        <p className="text-base font-semibold leading-relaxed text-white sm:text-lg">{translate('Una de las primeras academias de Girona.')}</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
