
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import { LegalPage } from '../components/legal-page'
import { getPublicSettings } from '@/lib/public-settings'

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({
    title: 'Política de privacidad',
    description: 'Cómo trata Academy Costa Brava los datos personales.'
}, translate)
}

export default async function PrivacidadPage() {
    const translate = await getT()

    const settings = await getPublicSettings()
    const name = settings.academy_legal_name || settings.academy_name || 'Academy Costa Brava'
    const email = settings.privacy_contact_email || settings.academy_email || ''

    return (
        <LegalPage title={translate("Política de privacidad")}>
            <section>
                <h2>{translate("1. Responsable del tratamiento")}</h2>
                <p>{translate("El responsable es ")}{translate(name)}{translate(settings.academy_cif ? `, NIF/CIF ${settings.academy_cif}` : '')}{translate(settings.academy_address ? `, con domicilio en ${settings.academy_address}` : '')}{translate(".")}</p>
                {translate(email && <p>{translate("Contacto para privacidad: ")}<a href={`mailto:${email}`}>{translate(email)}</a>{translate(".")}</p>)}
            </section>
            <section>
                <h2>{translate("2. Datos, finalidades y base jurídica")}</h2>
                <ul>
                    <li>{translate("Consultas y solicitudes: nombre, teléfono, email y mensaje, tratados para responder a petición del interesado y, cuando corresponda, con su consentimiento.")}</li>
                    <li>{translate("Inscripciones y gestión deportiva: datos del jugador y tutores, necesarios para prestar el servicio y cumplir obligaciones legales.")}</li>
                    <li>{translate("Portal privado: cuenta, documentos, pagos, asistencia y seguimiento, necesarios para gestionar la relación con las familias.")}</li>
                    <li>{translate("Comunicaciones comerciales: solo cuando exista consentimiento, que puede retirarse en cualquier momento.")}</li>
                </ul>
            </section>
            <section>
                <h2>{translate("3. Conservación y destinatarios")}</h2>
                <p>{translate("Los datos se conservan durante la relación y, después, durante los plazos exigidos para atender responsabilidades. Los proveedores técnicos acceden únicamente cuando es necesario y bajo sus obligaciones contractuales. No se venden datos personales.")}</p>
            </section>
            <section>
                <h2>{translate("4. Menores e imágenes")}</h2>
                <p>{translate("Los datos de menores son facilitados y gestionados por sus tutores legales. La publicación de imágenes o vídeos requiere una autorización específica y revocable, separada de la mera prestación del servicio cuando así lo exige la normativa.")}</p>
            </section>
            <section>
                <h2>{translate("5. Derechos")}</h2>
                <p>{translate("Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad mediante el correo de contacto, acreditando tu identidad. También puedes reclamar ante la Agencia Española de Protección de Datos.")}</p>
            </section>
        </LegalPage>
    )
}
