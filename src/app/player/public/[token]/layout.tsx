export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-yellow-100/50 rounded-full blur-3xl" />
            </div>

            <main className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
                {children}
            </main>
        </div>
    )
}
