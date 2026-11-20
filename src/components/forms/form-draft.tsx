'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useT } from '@/lib/i18n/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Value = string | number | boolean | string[] | number[]
type Snapshot = { version: 1; updatedAt: number; fields: Record<string, string | boolean>; states: Record<string, Value> }
const empty = (): Snapshot => ({ version: 1, updatedAt: Date.now(), fields: {}, states: {} })
const maxAge = 24 * 60 * 60 * 1000
const Context = createContext<{
    initial: Snapshot
    available: boolean
    write: (section: 'fields' | 'states', name: string, value: Value) => void
    clear: () => void
    reset: () => void
} | null>(null)
const Scope = createContext('')

// Drafts belong to this tab and this family/activity, never to the server.
export function FormDraft(props: { storageKey: string; children: ReactNode }) {
    return <DraftLoader key={props.storageKey} {...props} />
}
function DraftLoader({ storageKey, children }: { storageKey: string; children: ReactNode }) {
    const translate = useT()
    const [loaded, setLoaded] = useState<Snapshot | null>(null)
    const [available, setAvailable] = useState(true)
    useEffect(() => {
        let snapshot = empty()
        try {
            const raw = sessionStorage.getItem(storageKey)
            if (raw && raw.length >= 200000) sessionStorage.removeItem(storageKey)
            if (raw && raw.length < 200000) {
                let value
                try { value = JSON.parse(raw) } catch { sessionStorage.removeItem(storageKey) }
                if (value?.version === 1 && Number.isFinite(value.updatedAt) && Date.now() - value.updatedAt < maxAge && value.updatedAt <= Date.now() && value.fields && value.states && typeof value.fields === 'object' && typeof value.states === 'object') snapshot = value
                else sessionStorage.removeItem(storageKey)
            }
        } catch { setAvailable(false) }
        // Synchronize browser-only storage after hydration, before mounting inputs.
        setLoaded(snapshot)
    }, [storageKey])
    if (!loaded) return <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-600">{translate('Preparando tu formulario…')}</p>
    return <DraftSession key={storageKey} initial={loaded} available={available} storageKey={storageKey}>{children}</DraftSession>
}

function DraftSession({ initial, available: initialAvailable, storageKey, children }: { initial: Snapshot; available: boolean; storageKey: string; children: ReactNode }) {
    const [snapshot, setSnapshot] = useState(initial)
    const current = useRef(initial)
    const [available, setAvailable] = useState(initialAvailable)
    const [generation, setGeneration] = useState(0)
    const write = useCallback((section: 'fields' | 'states', name: string, value: Value) => {
        current.current = { ...current.current, updatedAt: Date.now(), [section]: { ...current.current[section], [name]: value } }
        setSnapshot(current.current)
        try { sessionStorage.setItem(storageKey, JSON.stringify(current.current)) } catch { setAvailable(false) }
    }, [storageKey])
    const clear = useCallback(() => {
        current.current = empty()
        setSnapshot(current.current)
        try { sessionStorage.removeItem(storageKey) } catch { setAvailable(false) }
    }, [storageKey])
    return <Context.Provider value={{ initial: snapshot, available, write, clear, reset: () => { clear(); setGeneration(n => n + 1) } }}><div key={generation}>{children}</div></Context.Provider>
}

export function useFormDraft() {
    const value = useContext(Context)
    if (!value) throw new Error('FormDraft provider is required')
    return value
}

export function useDraftState<T extends Value>(name: string, fallback: T | (() => T), valid: (value: T) => boolean = () => true): [T, Dispatch<SetStateAction<T>>] {
    const draft = useFormDraft()
    const [value, setValue] = useState<T>(() => {
        const original = typeof fallback === 'function' ? fallback() : fallback
        const saved = draft.initial.states[name]
        if (Array.isArray(original)) return (Array.isArray(saved) && saved.every(item => typeof item === (typeof original[0] === 'undefined' ? 'string' : typeof original[0])) && valid(saved as T) ? saved : original) as T
        return (typeof saved === typeof original && valid(saved as T) ? saved : original) as T
    })
    const current = useRef(value)
    const update = useCallback<Dispatch<SetStateAction<T>>>((action) => {
        const next = typeof action === 'function' ? action(current.current) : action
        current.current = next
        draft.write('states', name, next)
        setValue(next)
    }, [draft, name])
    return [value, update]
}

export function useScopedDraftState<T extends Value>(name: string, fallback: T, valid: (value: T) => boolean = () => true) {
    const scope = useContext(Scope)
    return useDraftState(`${scope}:${name}`, fallback, valid)
}

export function DraftNotice() {
    const translate = useT()
    const draft = useFormDraft()
    return <div className="flex flex-col gap-3 rounded-xl border border-gold/30 bg-amber-50 p-4 text-sm text-navy sm:flex-row sm:items-center sm:justify-between">
        <p>{translate(draft.available ? 'Guardamos tu borrador en esta pestaña durante 24 horas. Puedes volver atrás o recargar sin empezar de nuevo.' : 'Este navegador no permite guardar el borrador. Mantén esta página abierta hasta enviar.')}</p>
        <button type="button" onClick={draft.reset} className="min-h-11 shrink-0 rounded-lg border border-navy/20 px-3 font-semibold underline">{translate('Borrar borrador')}</button>
    </div>
}

export function DraftScope({ name, children }: { name: string; children: ReactNode }) { return <Scope.Provider value={name}>{children}</Scope.Provider> }
function useField(name?: string) {
    const draft = useFormDraft()
    const scope = useContext(Scope)
    const key = `${scope}:${name || ''}`
    return { saved: draft.initial.fields[key], save: (value: string | boolean) => { if (name) draft.write('fields', key, value) } }
}

export function DraftInput({ styled = false, ...props }: ComponentProps<'input'> & { styled?: boolean }) {
    const { saved, save } = useField(props.name)
    const allowed = !!props.name && !props.readOnly && !['password', 'file', 'hidden', 'submit'].includes(props.type || '') && props.name !== 'website'
    const controlled = props.value !== undefined || props.checked !== undefined
    const Component = styled ? Input : 'input'
    return <Component {...props}
        defaultValue={!controlled && allowed && props.type !== 'checkbox' && typeof saved === 'string' ? saved : props.defaultValue}
        defaultChecked={!controlled && allowed && props.type === 'checkbox' && typeof saved === 'boolean' ? saved : props.defaultChecked}
        onChange={event => { props.onChange?.(event); if (allowed && !controlled) save(props.type === 'checkbox' ? event.target.checked : event.target.value) }} />
}
export function DraftSelect(props: ComponentProps<'select'>) {
    const { saved, save } = useField(props.name)
    return <select {...props} defaultValue={props.value === undefined && typeof saved === 'string' ? saved : props.defaultValue} onChange={event => { props.onChange?.(event); if (props.value === undefined) save(event.target.value) }} />
}
export function DraftTextarea({ styled = false, ...props }: ComponentProps<'textarea'> & { styled?: boolean }) {
    const { saved, save } = useField(props.name)
    const Component = styled ? Textarea : 'textarea'
    return <Component {...props} defaultValue={props.value === undefined && typeof saved === 'string' ? saved : props.defaultValue} onChange={event => { props.onChange?.(event); if (props.value === undefined) save(event.target.value) }} />
}
