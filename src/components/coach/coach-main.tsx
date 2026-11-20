'use client'
import {useEffect,useRef,type ReactNode} from 'react'
import {usePathname} from 'next/navigation'
export function CoachMain({children}:{children:ReactNode}){
 const pathname=usePathname(),ref=useRef<HTMLElement>(null)
 useEffect(()=>{ref.current?.scrollTo({top:0})},[pathname])
 return <main ref={ref} className="flex-1 overflow-y-auto overscroll-y-contain pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-8">{children}</main>
}
