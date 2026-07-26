"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Trash2 } from "lucide-react"
import { deleteWorker } from "@/app/actions/workers"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"

export function DeleteWorkerItem({ worker }: { worker: { id: string, full_name: string } }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        const res = await deleteWorker(worker.id)
        setLoading(false)
        if (res.success) {
            if ('warning' in res && res.warning) toast.warning(res.warning)
            else toast.success("Trabajador eliminado")
            setOpen(false)
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <>
            <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onSelect={(event) => {
                    event.preventDefault()
                    setOpen(true)
                }}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Eliminar</span>
            </DropdownMenuItem>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar a {worker.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            También se eliminará su cuenta de acceso. Si tiene equipos o eventos asociados, el sistema bloqueará el borrado para conservar el historial.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction disabled={loading} onClick={(event) => {
                            event.preventDefault()
                            void handleDelete()
                        }} className="bg-red-600 hover:bg-red-700">
                            {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
