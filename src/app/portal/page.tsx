
import { LanguageSwitcher } from '@/lib/i18n/client'
import { getT } from '@/lib/i18n/server'
import { LoginForm } from "./login-form"

export default async function LoginPage() {
    const translate = await getT()

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-navy relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="w-full max-w-md space-y-8 relative z-10">
                <div className="flex justify-end"><LanguageSwitcher /></div>
                <div className="text-center">
                    <h2 className="mt-6 text-4xl font-heading font-bold tracking-tight text-white uppercase">
                        {translate("Portal ")}<span className="text-primary">{translate("Familias")}</span>
                    </h2>
                    <p className="mt-2 text-sm text-gray-300">
                        {translate("Accede para ver el progreso y novedades de tu hijo/a")}</p>
                </div>

                <LoginForm />

                <div className="text-center text-xs text-white/40">
                    {translate("© ")}{translate(new Date().getFullYear())} {translate(" Academy Costa Brava.")}</div>
            </div>
        </div>
    )
}
