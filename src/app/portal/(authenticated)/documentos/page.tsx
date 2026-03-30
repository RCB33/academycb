import { FileText } from "lucide-react"

export default function DocumentosPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 text-center text-slate-500">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                <FileText className="h-10 w-10 text-indigo-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Documentos Proximamente</h2>
            <p>Tus documentos y autorizaciones médicas aparecerán en este apartado.</p>
        </div>
    )
}
