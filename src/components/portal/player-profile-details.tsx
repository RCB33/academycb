'use client'
import { useState,useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { useT } from '@/lib/i18n/client'
import { CLUB_CATEGORIES,CLUB_DIVISIONS,playerBirthLabel,type PlayerProfile } from '@/lib/player-profile'
import { updatePlayerProfile } from '@/app/actions/player-profile'
import { BirthDateInput } from '@/components/ui/birth-date-input'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog'

export function PlayerProfileDetails({player,editable=false,compact=false,onSaved}:{player:PlayerProfile;editable?:boolean;compact?:boolean;onSaved?:()=>void}) {
    const t=useT(),router=useRouter(),[open,setOpen]=useState(false),[pending,start]=useTransition(),[error,setError]=useState('')
    const facts=[
        ['Fecha de nacimiento',playerBirthLabel(player,t.locale)],['Club',player.club_name],
        ['Categoría en su club',player.club_category ? t(player.club_category) : null],['División',player.club_division ? t(player.club_division) : null],
    ]
    return <section aria-label={`${t('Perfil de')} ${player.full_name}`} className={compact?'space-y-4':'space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'}>
        <dl className={`grid gap-x-5 gap-y-4 ${compact?'grid-cols-2':'grid-cols-2 lg:grid-cols-4'}`}>
            {facts.map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{t(label!)}</dt><dd className="mt-1 break-words text-sm font-bold text-navy">{value || t('Pendiente de completar')}</dd>{label==='Fecha de nacimiento' && !player.birth_date && player.birth_year && <p className="mt-1 text-xs text-slate-500">{t('Fecha completa pendiente')}</p>}</div>)}
        </dl>
        {editable && <Button type="button" variant="outline" size="sm" aria-label={`${t('Editar perfil de')} ${player.full_name}`} onClick={()=>{setError('');setOpen(true)}}><Pencil className="mr-2 h-4 w-4" />{t('Editar perfil')}</Button>}
        <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{t('Perfil de')} {player.full_name}</DialogTitle><DialogDescription>{t('Indica la categoría y la división en las que juega en su club. Estos datos no cambian su grupo de Academy.')}</DialogDescription></DialogHeader>
            <form className="space-y-5" action={form=>{setError('');start(async()=>{try{
                const result=await updatePlayerProfile(player.id,Object.fromEntries(['birth_date','club_name','club_category','club_division'].map(key=>[key,String(form.get(key)||'')])))
                if(!result.success)setError(t(result.error || 'No se pudo guardar el perfil.'));else{setOpen(false);router.refresh();onSaved?.()}
            }catch{setError(t('No se pudo guardar el perfil.'))}})}}>
                <fieldset disabled={pending} className="space-y-5">
                    <BirthDateInput persistDraft={false} name="birth_date" defaultValue={player.birth_date || ''} required={Boolean(player.birth_date)} max={new Date().toISOString().slice(0,10)} />
                    <label className="block text-sm font-semibold">{t('Club')}<input aria-label={t('Club')} name="club_name" defaultValue={player.club_name || ''} maxLength={120} placeholder={t('Nombre del club')} className="mt-1 block min-h-12 w-full rounded-xl border px-3 text-base font-normal" /></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold">{t('Categoría en su club')}<select aria-label={t('Categoría en su club')} name="club_category" defaultValue={player.club_category || ''} className="mt-1 block min-h-12 w-full rounded-xl border bg-white px-3 text-base font-normal"><option value="">{t('Pendiente de completar')}</option>{CLUB_CATEGORIES.map(value=><option key={value} value={value}>{t(value)}</option>)}</select></label>
                        <label className="block text-sm font-semibold">{t('División')}<select aria-label={t('División')} name="club_division" defaultValue={player.club_division || ''} className="mt-1 block min-h-12 w-full rounded-xl border bg-white px-3 text-base font-normal"><option value="">{t('Pendiente de completar')}</option>{CLUB_DIVISIONS.map(value=><option key={value} value={value}>{t(value)}</option>)}</select></label>
                    </div>
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <Button disabled={pending} className="w-full">{t(pending?'Guardando…':'Guardar perfil')}</Button>
                </fieldset>
            </form>
        </DialogContent></Dialog>
    </section>
}
