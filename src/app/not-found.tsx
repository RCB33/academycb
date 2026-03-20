import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <h1 className="text-6xl font-black text-slate-900 mb-2">404</h1>
                <p className="text-lg text-slate-500 mb-6">Página no encontrada</p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
                >
                    ← Volver al inicio
                </Link>
            </div>
        </div>
    )
}
