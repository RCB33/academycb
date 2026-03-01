import { getWorkers } from "@/app/actions/workers"
import { WorkerDialog } from "./components/worker-dialog"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkerCard } from "./components/worker-card"

export default async function WorkersPage() {
    const workers = await getWorkers()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Equipo Técnico</h1>
                    <p className="text-muted-foreground">
                        Gestiona los entrenadores, fisios y directivos de la academia.
                    </p>
                </div>
                <WorkerDialog mode="create" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {workers?.map((worker) => (
                    <WorkerCard key={worker.id} worker={worker} />
                ))}

                {/* Empty State / Add Card */}
                <div className="relative min-h-[250px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-yellow-500 hover:text-yellow-600 transition-colors cursor-pointer group">
                    <div className="mb-4 p-4 rounded-full bg-slate-50 group-hover:bg-yellow-50 transition-colors">
                        <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-bold">Añadir Nuevo Miembro</span>
                    <div className="mt-4">
                        <WorkerDialog
                            mode="create"
                            trigger={
                                <Button variant="ghost" className="inset-0 absolute w-full h-full opacity-0">Add</Button>
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
