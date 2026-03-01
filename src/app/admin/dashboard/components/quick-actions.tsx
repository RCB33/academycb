'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, UserPlus, CreditCard, Users, Zap } from "lucide-react"
import Link from 'next/link'
import { CreateStudentDialog } from "@/components/admin/create-student-dialog"

export function QuickActions() {
    return (
        <Card className="border-none shadow-lg bg-gradient-to-br from-navy to-navy-light text-white overflow-hidden relative border-l-4 border-l-gold">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="h-24 w-24 text-gold" />
            </div>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-gold" />
                    Acciones Rápidas
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 relative z-10">
                <div className="bg-white/10 rounded-lg p-1">
                    {/* Reuse existing dialog but style the trigger differently if possible, 
                        or just use the component which renders its own button. 
                        We wrap it to control layout if needed, but CreateStudentDialog renders a button.
                        Ideally CreateStudentDialog should accept a 'trigger' prop, but looking at code it uses fixed button.
                        I'll use it as is for now, or wrap it.
                    */}
                    <div className="w-full [&>button]:w-full [&>button]:bg-white [&>button]:text-indigo-700 [&>button]:hover:bg-indigo-50 [&>button]:justify-start">
                        <CreateStudentDialog />
                    </div>
                </div>

                <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/20 hover:text-white" asChild>
                    <Link href="/admin/leads">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Nuevo Lead Manual
                    </Link>
                </Button>

                <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/20 hover:text-white" asChild>
                    <Link href="/admin/finanzas">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Registrar Pago
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
