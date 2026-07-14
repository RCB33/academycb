import { LegalPage } from '../components/legal-page'
import { getPublicSettings } from '@/lib/public-settings'

export const metadata = {
    title: 'Aviso legal',
    description: 'Información legal del titular de Academy Costa Brava.'
}

export default async function AvisoLegalPage() {
    const settings = await getPublicSettings()
    const name = settings.academy_legal_name || settings.academy_name || 'Academy Costa Brava'
    const email = settings.academy_email || ''

    return (
        <LegalPage title="Aviso legal">
            <section>
                <h2>1. Titular del sitio</h2>
                <p>Este sitio web es operado por {name}.</p>
                <ul>
                    {settings.academy_cif && <li>NIF/CIF: {settings.academy_cif}</li>}
                    {settings.academy_address && <li>Domicilio: {settings.academy_address}</li>}
                    {email && <li>Contacto: <a href={`mailto:${email}`}>{email}</a></li>}
                </ul>
                {!settings.academy_cif && <p>Antes de publicar, el responsable debe completar su denominación legal, NIF/CIF y domicilio desde Ajustes.</p>}
            </section>
            <section>
                <h2>2. Finalidad y condiciones de uso</h2>
                <p>La web informa sobre la academia, sus actividades y servicios, y facilita canales de contacto y áreas privadas. El usuario se compromete a utilizarla de forma lícita y a no intentar acceder a información o sistemas sin autorización.</p>
            </section>
            <section>
                <h2>3. Propiedad intelectual</h2>
                <p>Los contenidos, diseños, fotografías, marcas y código están protegidos por la normativa aplicable y pertenecen a sus respectivos titulares. No se autoriza su reproducción o explotación fuera de los usos permitidos por ley sin consentimiento.</p>
            </section>
            <section>
                <h2>4. Responsabilidad y enlaces</h2>
                <p>Se procura mantener la información actualizada y el servicio disponible, pero no se garantiza la ausencia total de errores o interrupciones. Los enlaces externos se ofrecen como referencia y sus contenidos dependen de terceros.</p>
            </section>
        </LegalPage>
    )
}
