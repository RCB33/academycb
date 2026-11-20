import {getCoachPlayers} from '@/lib/coach-data'
import {PlayerDirectory} from '@/components/coach/player-directory'
export default async function CoachPlayers(){
 const players=await getCoachPlayers()
 return <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6"><header className="rounded-3xl bg-navy p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-gold">Seguimiento deportivo</p><h1 className="mt-2 text-3xl font-black">Todos los jugadores</h1><p className="mt-3 text-sm text-slate-300">Consulta la ficha, pon notas y registra cada revisión. Acceso deportivo compartido, sin información de pagos.</p></header><PlayerDirectory players={players}/></div>
}
