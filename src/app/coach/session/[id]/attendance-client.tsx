'use client'

import { useState } from 'react'
import { markAttendance } from '@/app/actions/coach'
import { Button } from '@/components/ui/button'
import { Check, X, UserMinus, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Child {
    id: string
    full_name: string
    attendance: 'present' | 'absent' | 'excused' | null
}

export function AttendanceClient({ childrenData, sessionDate }: { childrenData: Child[], sessionDate: string }) {
    const [kids, setKids] = useState<Child[]>(childrenData)
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

    const handleMark = async (childId: string, status: 'present' | 'absent' | 'excused') => {
        setLoadingMap(prev => ({ ...prev, [childId]: true }))

        // Optimistic UI update
        const previousKids = [...kids]
        setKids(prev => prev.map(k => k.id === childId ? { ...k, attendance: status } : k))

        try {
            await markAttendance(childId, status, sessionDate)
            toast.success("Asistencia guardada")
        } catch (error) {
            // Revert on error
            setKids(previousKids)
            toast.error("No se pudo guardar la asistencia. Intenta de nuevo.")
        } finally {
            setLoadingMap(prev => ({ ...prev, [childId]: false }))
        }
    }

    return (
        <div className="space-y-3 mt-6">
            {kids.map(kid => {
                const isSaving = loadingMap[kid.id]
                return (
                    <div key={kid.id} className="bg-white p-3 rounded-xl shadow-sm border flex items-center justify-between">
                        <div className="font-medium text-sm md:text-base text-navy flex-1">
                            {kid.full_name}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 opacity-100 transition-opacity">
                            {isSaving ? (
                                <div className="h-10 w-[120px] flex justify-center items-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    <Button
                                        variant={kid.attendance === 'present' ? 'default' : 'outline'}
                                        size="icon"
                                        className={cn(
                                            "rounded-full h-10 w-10 border-2",
                                            kid.attendance === 'present' && "bg-green-600 hover:bg-green-700 border-green-600",
                                            kid.attendance !== 'present' && "border-green-200 text-green-600 hover:bg-green-50"
                                        )}
                                        onClick={() => handleMark(kid.id, 'present')}
                                    >
                                        <Check className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        variant={kid.attendance === 'absent' ? 'destructive' : 'outline'}
                                        size="icon"
                                        className={cn(
                                            "rounded-full h-10 w-10 border-2",
                                            kid.attendance === 'absent' && "bg-red-600 hover:bg-red-700 border-red-600",
                                            kid.attendance !== 'absent' && "border-red-200 text-red-600 hover:bg-red-50"
                                        )}
                                        onClick={() => handleMark(kid.id, 'absent')}
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        variant={kid.attendance === 'excused' ? 'secondary' : 'outline'}
                                        size="icon"
                                        className={cn(
                                            "rounded-full h-10 w-10 border-2",
                                            kid.attendance === 'excused' && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500",
                                            kid.attendance !== 'excused' && "border-amber-200 text-amber-600 hover:bg-amber-50"
                                        )}
                                        onClick={() => handleMark(kid.id, 'excused')}
                                    >
                                        <UserMinus className="h-5 w-5" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
