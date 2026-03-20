"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Users,
    Search,
    MessageSquare,
    Activity,
    Trophy,
    ShoppingBag,
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"

export function SearchCommand() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()
    const supabase = createClient()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        if (!query) {
            setResults([])
            return
        }

        const searchStudents = async () => {
            setLoading(true)
            const { data } = await supabase
                .from('children')
                .select('id, full_name')
                .ilike('full_name', `%${query}%`)
                .limit(5)

            if (data) setResults(data)
            setLoading(false)
        }

        const timer = setTimeout(searchStudents, 300)
        return () => clearTimeout(timer)
    }, [query, supabase])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        setQuery("")
        command()
    }, [])

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="relative inline-flex h-9 w-full items-center justify-start rounded-[0.5rem] bg-slate-100/80 border border-slate-200 px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-slate-200/80 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 md:w-40 lg:w-64 group"
            >
                <Search className="mr-2 h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="truncate">Buscar alumno o sección...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex shadow-sm">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Escribe el nombre de un alumno o navega..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList className="scrollbar-hide">
                    <CommandEmpty>No se encontraron resultados para &quot;{query}&quot;.</CommandEmpty>

                    {loading && (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <Activity className="h-4 w-4 animate-pulse" /> Buscando...
                        </div>
                    )}

                    {results.length > 0 && (
                        <CommandGroup heading="Alumnos Encontrados">
                            {results.map((student) => (
                                <CommandItem
                                    key={student.id}
                                    onSelect={() => runCommand(() => router.push(`/admin/crm/alumnos/${student.id}`))}
                                    className="flex items-center gap-2"
                                >
                                    <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                        {student.full_name.charAt(0)}
                                    </div>
                                    <span>{student.full_name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandGroup heading="Sugerencias y Navegación">
                        <CommandItem onSelect={() => runCommand(() => router.push("/admin/dashboard"))}>
                            <Activity className="mr-2 h-4 w-4 text-slate-400" />
                            <span>Dashboard General</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/admin/crm/alumnos"))}>
                            <Users className="mr-2 h-4 w-4 text-slate-400" />
                            <span>Alumnos 360º</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/admin/leads"))}>
                            <MessageSquare className="mr-2 h-4 w-4 text-slate-400" />
                            <span>Solicitudes Web (Leads)</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Operativa">
                        <CommandItem onSelect={() => runCommand(() => router.push("/admin/academia"))}>
                            <Activity className="mr-2 h-4 w-4 text-slate-400" />
                            <span>Gestión Academia</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/admin/campus"))}>
                            <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                            <span>Campus</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/admin/torneos"))}>
                            <Trophy className="mr-2 h-4 w-4 text-slate-400" />
                            <span>Torneos</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/admin/tienda"))}>
                            <ShoppingBag className="mr-2 h-4 w-4 text-slate-400" />
                            <span>Tienda</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Configuración">
                        <CommandItem onSelect={() => runCommand(() => router.push("/admin/ajustes"))}>
                            <Settings className="mr-2 h-4 w-4 text-slate-400" />
                            <span>Ajustes del Sistema</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
