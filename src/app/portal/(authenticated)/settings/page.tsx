import { Settings } from "lucide-react"

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 text-center text-slate-500">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                <Settings className="h-10 w-10 text-indigo-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ajustes Proximamente</h2>
            <p>Podrás modificar tus preferencias de notificaciones e idioma desde aquí.</p>
        </div>
    )
}
