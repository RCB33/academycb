
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import ShopSection from "../components/shop-section";
import { getPublicProducts } from "@/lib/public-catalog";

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({
    title: 'Tienda oficial',
    description: 'Catálogo oficial de Academy Costa Brava.'
}, translate)
}

export default async function ShopPage() {
    const translate = await getT()

    const products = await getPublicProducts()
    return (
        <main className="min-h-screen bg-white pt-20">
            {/* Small header/spacing to account for the fixed navbar */}
            <div className="bg-navy py-12">
                <div className="container text-center">
                    <h1 className="font-heading text-4xl md:text-5xl text-white uppercase tracking-wider">{translate("Tienda Oficial")}</h1>
                    <p className="text-gray-300 mt-4 max-w-2xl mx-auto">
                        {translate("Equípate como un profesional con nuestra colección oficial")}</p>
                </div>
            </div>

            <ShopSection products={products} />
        </main>
    )
}
