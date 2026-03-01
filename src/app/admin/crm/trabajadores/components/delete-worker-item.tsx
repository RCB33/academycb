"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Trash2 } from "lucide-react"
import { deleteWorker } from "@/app/actions/workers"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function DeleteWorkerItem({ id }: { id: string }) {
    const router = useRouter()

    const handleDelete = async () => {
        const res = await deleteWorker(id)
        if (res.success) {
            toast.success("Trabajador eliminado")
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <DropdownMenuItem
            className="text-red-600 focus:text-red-600 cursor-pointer"
            onClick={handleDelete}
        >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
        </DropdownMenuItem>
    )
}
