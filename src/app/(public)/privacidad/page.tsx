import { LegalPage } from '../components/legal-page'
import { getPublicSettings } from '@/lib/public-settings'

export const metadata = {
    title: 'Política de privacidad',
    description: 'Cómo trata Academy Costa Brava los datos personales.'
}

export default async function PrivacidadPage() {
    const settings = await getPublicSettings()
    const name = settings.academy_legal_name || settings.academy_name || 'Academy Costa Brava'
    const email = settings.privacy_contact_email || settings.academy_email || ''

    return (
        <LegalPage title="Política de privacidad">
            <section>
                <h2>1. Responsable del tratamiento</h2>
                <p>El responsable es {name}{settings.academy_cif ? `, NIF/CIF ${settings.academy_cif}` : ''}{settings.academy_address ? `, con domicilio en ${settings.academy_address}` : ''}.</p>
                {email && <p>Contacto para privacidad: <a href={`mailto:${email}`}>{email}</a>.</p>}
            </section>
            <section>
                <h2>2. Datos, finalidades y base jurídica</h2>
                <ul>
                    <li>Consultas y solicitudes: nombre, teléfono, email y mensaje, tratados para responder a petición del interesado y, cuando corresponda, con su consentimiento.</li>
                    <li>Inscripciones y gestión deportiva: datos del jugador y tutores, necesarios para prestar el servicio y cumplir obligaciones legales.</li>
                    <li>Portal privado: cuenta, documentos, pagos, asistencia y seguimiento, necesarios para gestionar la relación con las familias.</li>
                    <li>Comunicaciones comerciales: solo cuando exista consentimiento, que puede retirarse en cualquier momento.</li>
                </ul>
            </section>
            <section>
                <h2>3. Conservación y destinatarios</h2>
                <p>Los datos se conservan durante la relación y, después, durante los plazos exigidos para atender responsabilidades. Los proveedores técnicos acceden únicamente cuando es necesario y bajo sus obligaciones contractuales. No se venden datos personales.</p>
            </section>
            <section>
                <h2>4. Menores e imágenes</h2>
                <p>Los datos de menores son facilitados y gestionados por sus tutores legales. La publicación de imágenes o vídeos requiere una autorización específica y revocable, separada de la mera prestación del servicio cuando así lo exige la normativa.</p>
            </section>
            <section>
                <h2>5. Derechos</h2>
                <p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad mediante el correo de contacto, acreditando tu identidad. También puedes reclamar ante la Agencia Española de Protección de Datos.</p>
            </section>
        </LegalPage>
    )
}
