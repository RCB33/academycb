import ShopSection from "../components/shop-section";

export default function ShopPage() {
    return (
        <main className="min-h-screen bg-white pt-20">
            {/* Small header/spacing to account for the fixed navbar */}
            <div className="bg-navy py-12">
                <div className="container text-center">
                    <h1 className="font-heading text-4xl md:text-5xl text-white uppercase tracking-wider">Tienda Oficial</h1>
                    <p className="text-gray-300 mt-4 max-w-2xl mx-auto">
                        Equípate como un profesional con nuestra colección oficial
                    </p>
                </div>
            </div>

            <ShopSection />
        </main>
    )
}
