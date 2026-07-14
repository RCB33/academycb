import type { ReactNode } from 'react'

export function LegalPage({ title, updated = '13 de julio de 2026', children }: { title: string; updated?: string; children: ReactNode }) {
    return (
        <main className="bg-slate-50 py-16 md:py-24">
            <article className="container max-w-4xl rounded-2xl border bg-white p-7 shadow-sm md:p-12">
                <h1 className="font-heading text-4xl font-bold text-navy md:text-5xl">{title}</h1>
                <p className="mt-3 text-sm text-slate-500">Última actualización: {updated}</p>
                <div className="mt-10 space-y-8 text-base leading-7 text-slate-700 [&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-navy [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3">
                    {children}
                </div>
            </article>
        </main>
    )
}
