'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { pdf } from '@react-pdf/renderer'
import { StudentProgressReport } from './report-pdf'
import { toast } from 'sonner'

interface ReportDownloadButtonProps {
    student: any
    metrics: any
    attendanceStats: { total: number, present: number, percentage: string }
    coachNotes: string
}

export function ReportDownloadButton({ student, metrics, attendanceStats, coachNotes }: ReportDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleDownload = async () => {
        setIsGenerating(true)
        try {
            // Prepare data for the PDF
            const reportData = {
                studentName: student.full_name,
                category: student.category?.name || 'Academia',
                term: 'Evaluación Continua',
                date: new Date().toLocaleDateString(),
                metrics: {
                    pace: metrics?.pace || 50,
                    shooting: metrics?.shooting || 50,
                    passing: metrics?.passing || 50,
                    dribbling: metrics?.dribbling || 50,
                    defending: metrics?.defending || 50,
                    physical: metrics?.physical || 50,
                    discipline: metrics?.discipline || 50
                },
                attendance: attendanceStats,
                coachNotes: coachNotes,
                coachName: "Cuerpo Técnico" // Ideally fetched from logged in user if they are a coach
            }

            // Generate blob
            const blob = await pdf(<StudentProgressReport data={reportData} />).toBlob()

            // Create download link
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Boletin_${student.full_name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success("Boletín PDF generado correctamente")
        } catch (error) {
            console.error("Error generating PDF:", error)
            toast.error("Hubo un error al generar el PDF")
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button
            onClick={handleDownload}
            disabled={isGenerating || !metrics}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md transform hover:scale-105 transition-all"
        >
            {isGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
            ) : (
                <><Download className="mr-2 h-4 w-4" /> Boletín Oficial (PDF)</>
            )}
        </Button>
    )
}
