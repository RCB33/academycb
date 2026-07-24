"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { KeyRound, Loader2, MoreHorizontal, Pencil } from "lucide-react"
import { WorkerDialog } from "./worker-dialog"
import { DeleteWorkerItem } from "./delete-worker-item"
import { resendWorkerAccessEmail } from "@/app/actions/workers"
import { useState } from "react"
import { toast } from "sonner"

export function WorkerActions({ worker }: { worker: any }) {
    const [sending, setSending] = useState(false)

    async function handleResendAccess() {
        setSending(true)
        const result = await resendWorkerAccessEmail(worker.id)
        setSending(false)
        if (result.success) toast.success('Correo de acceso enviado')
        else toast.error(result.error)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-8 w-8">
                    <MoreHorizontal className="w-5 h-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <div onClick={(e) => e.stopPropagation()}>
                    <WorkerDialog mode="edit" worker={worker} trigger={
                        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                        </div>
                    } />
                </div>
                {worker.user_id && worker.access_enabled && (
                    <DropdownMenuItem onSelect={(event) => {
                        event.preventDefault()
                        void handleResendAccess()
                    }}>
                        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        <span>Enviar acceso</span>
                    </DropdownMenuItem>
                )}
                <DeleteWorkerItem worker={worker} />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
