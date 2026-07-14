import { LegalPage } from '../components/legal-page'

export const metadata = {
    title: 'Política de cookies',
    description: 'Información sobre las cookies utilizadas por Academy Costa Brava.'
}

export default function CookiesPage() {
    return (
        <LegalPage title="Política de cookies">
            <section>
                <h2>1. Qué utiliza esta web</h2>
                <p>La versión actual utiliza únicamente almacenamiento y cookies técnicas necesarias para mantener sesiones seguras, proteger el acceso al portal y conservar temporalmente el carrito de la tienda.</p>
            </section>
            <section>
                <h2>2. Servicios de terceros</h2>
                <p>La autenticación y la base de datos se prestan mediante Supabase. Algunas secciones pueden enlazar a webs externas; esas páginas aplican sus propias políticas. No se instalan cookies publicitarias o analíticas desde esta web en la configuración actual.</p>
            </section>
            <section>
                <h2>3. Control desde el navegador</h2>
                <p>Puedes eliminar o bloquear cookies desde la configuración del navegador. Si bloqueas las técnicas, el portal privado, la autenticación o el carrito pueden dejar de funcionar correctamente.</p>
            </section>
            <section>
                <h2>4. Cambios futuros</h2>
                <p>Si se añaden herramientas analíticas, publicitarias o cookies no esenciales, deberá implantarse previamente un mecanismo de consentimiento y actualizarse esta política.</p>
            </section>
        </LegalPage>
    )
}
