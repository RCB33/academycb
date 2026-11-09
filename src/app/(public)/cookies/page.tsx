
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import { LegalPage } from '../components/legal-page'

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({
    title: 'Política de cookies',
    description: 'Información sobre las cookies utilizadas por Academy Costa Brava.'
}, translate)
}

export default async function CookiesPage() {
    const translate = await getT()

    return (
        <LegalPage title={translate("Política de cookies")}>
            <section>
                <h2>{translate("1. Qué utiliza esta web")}</h2>
                <p>{translate("La versión actual utiliza únicamente almacenamiento y cookies técnicas necesarias para mantener sesiones seguras, proteger el acceso al portal y conservar temporalmente el carrito de la tienda y recordar el idioma elegido durante un año mediante la cookie academy_locale.")}</p>
            </section>
            <section>
                <h2>{translate("2. Servicios de terceros")}</h2>
                <p>{translate("La autenticación y la base de datos se prestan mediante Supabase. Algunas secciones pueden enlazar a webs externas; esas páginas aplican sus propias políticas. No se instalan cookies publicitarias o analíticas desde esta web en la configuración actual.")}</p>
            </section>
            <section>
                <h2>{translate("3. Control desde el navegador")}</h2>
                <p>{translate("Puedes eliminar o bloquear cookies desde la configuración del navegador. Si bloqueas las técnicas, el portal privado, la autenticación o el carrito pueden dejar de funcionar correctamente.")}</p>
            </section>
            <section>
                <h2>{translate("4. Cambios futuros")}</h2>
                <p>{translate("Si se añaden herramientas analíticas, publicitarias o cookies no esenciales, deberá implantarse previamente un mecanismo de consentimiento y actualizarse esta política.")}</p>
            </section>
        </LegalPage>
    )
}
