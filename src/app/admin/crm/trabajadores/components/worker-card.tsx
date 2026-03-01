"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Briefcase, Mail, Phone } from "lucide-react"
import { WorkerActions } from "./worker-actions"
import { WorkerDialog } from "./worker-dialog"
import { useState } from "react"

export function WorkerCard({ worker }: { worker: any }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    return (
        <>
            <WorkerDialog
                mode="edit"
                worker={worker}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />

            <div
                onClick={() => setIsDialogOpen(true)}
                className="h-full cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
                <Card className="h-full overflow-hidden border-slate-200 hover:shadow-xl transition-all duration-300 group relative">
                    <div className="h-24 bg-gradient-to-r from-slate-900 to-slate-800 relative">
                        {/* Actions with stopPropagation to avoid opening dialog when clicking menu */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                            <WorkerActions worker={worker} />
                        </div>

                        <div
                            className="absolute -bottom-10 left-6 w-20 h-20 rounded-full border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-white uppercase overflow-hidden"
                            style={{ backgroundColor: worker.avatar_url ? 'white' : (worker.color || '#3b82f6') }}
                        >
                            {worker.avatar_url ? (
                                <Avatar className="w-full h-full">
                                    <AvatarImage src={worker.avatar_url} className="object-cover" />
                                    <AvatarFallback>{worker.full_name?.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                            ) : (
                                worker.full_name?.substring(0, 2)
                            )}
                        </div>
                    </div>
                    <CardContent className="pt-12 pb-6 px-6">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 line-clamp-1" title={worker.full_name}>{worker.full_name}</h3>
                                <div className="flex items-center gap-2 text-yellow-600 font-bold text-sm uppercase tracking-wider mt-1">
                                    <Briefcase className="w-4 h-4" />
                                    <span className="line-clamp-1">{worker.position}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                            {worker.email && (
                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <span className="truncate">{worker.email}</span>
                                </div>
                            )}
                            {worker.phone && (
                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <span>{worker.phone}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
