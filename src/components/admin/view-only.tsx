'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { toast } from 'sonner'
const ViewOnlyContext = createContext(false)
export const useViewOnly = () => useContext(ViewOnlyContext)
export function ViewOnly({ children, enabled }: { children: ReactNode; enabled: boolean }) {
    return <ViewOnlyContext.Provider value={enabled}><div className="contents" onSubmitCapture={event => {
        if (!enabled) return
        event.preventDefault(); event.stopPropagation()
        toast.info('Vista de consulta. Vuelve a administración para realizar cambios.')
    }}>{children}</div></ViewOnlyContext.Provider>
}
