'use client'
import {useState} from 'react'
import Link from 'next/link'
import {Search,ArrowUpRight} from 'lucide-react'
export function PlayerDirectory({players}:{players:Array<{id:string;full_name:string;birth_year:number;groups:string}>}){
 const [query,setQuery]=useState('')
 const filtered=players.filter(p=>`${p.full_name} ${p.groups} ${p.birth_year}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
 return <div className="space-y-4"><label className="flex items-center gap-3 rounded-2xl border bg-white px-4"><Search className="h-5 w-5 shrink-0 text-slate-400"/><input aria-label="Buscar jugador, grupo o año" className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none" placeholder="Buscar jugador, grupo o año…" value={query} onChange={e=>setQuery(e.target.value)}/></label><p className="text-sm text-slate-500">{filtered.length} jugadores</p><div className="grid gap-3 sm:grid-cols-2">{filtered.map(p=><Link className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-gold" key={p.id} href={`/coach/jugadores/${p.id}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-black text-gold">{p.full_name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('')}</span><div className="min-w-0 flex-1"><strong className="block break-words text-navy">{p.full_name}</strong><p className="mt-1 break-words text-xs text-slate-500">{p.birth_year} · {p.groups||'Sin grupo fijo'}</p><p className="mt-2 text-xs font-bold text-blue-800">Notas, revisión y evolución</p></div><ArrowUpRight className="h-4 w-4 shrink-0"/></Link>)}</div>{!filtered.length&&<p className="rounded-xl border border-dashed p-6 text-center text-slate-500">No hay jugadores con esa búsqueda.</p>}</div>
}
