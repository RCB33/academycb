
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import { LegalPage } from '../components/legal-page'
import { getPublicSettings } from '@/lib/public-settings'

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({
    title: 'Aviso legal',
    description: 'Información legal del titular de Academy Costa Brava.'
}, translate)
}

export default async function AvisoLegalPage() {
    const translate = await getT()

    const settings = await getPublicSettings()
    const name = settings.academy_legal_name || settings.academy_name || 'Academy Costa Brava'
    const email = settings.academy_email || ''

    return (
        <LegalPage title={translate("Aviso legal")}>
            <section>
                <h2>{translate("1. Titular del sitio")}</h2>
                <p>{translate("Este sitio web es operado por ")}{translate(name)}{translate(".")}</p>
                <ul>
                    {translate(settings.academy_cif && <li>{translate("NIF/CIF: ")}{translate(settings.academy_cif)}</li>)}
                    {translate(settings.academy_address && <li>{translate("Domicilio: ")}{translate(settings.academy_address)}</li>)}
                    {translate(email && <li>{translate("Contacto: ")}<a href={`mailto:${email}`}>{translate(email)}</a></li>)}
                </ul>
                {translate(!settings.academy_cif && <p>{translate("Antes de publicar, el responsable debe completar su denominación legal, NIF/CIF y domicilio desde Ajustes.")}</p>)}
            </section>
            <section>
                <h2>{translate("2. Finalidad y condiciones de uso")}</h2>
                <p>{translate("La web informa sobre la academia, sus actividades y servicios, y facilita canales de contacto y áreas privadas. El usuario se compromete a utilizarla de forma lícita y a no intentar acceder a información o sistemas sin autorización.")}</p>
            </section>
            <section>
                <h2>{translate("3. Propiedad intelectual")}</h2>
                <p>{translate("Los contenidos, diseños, fotografías, marcas y código están protegidos por la normativa aplicable y pertenecen a sus respectivos titulares. No se autoriza su reproducción o explotación fuera de los usos permitidos por ley sin consentimiento.")}</p>
            </section>
            <section>
                <h2>{translate("4. Responsabilidad y enlaces")}</h2>
                <p>{translate("Se procura mantener la información actualizada y el servicio disponible, pero no se garantiza la ausencia total de errores o interrupciones. Los enlaces externos se ofrecen como referencia y sus contenidos dependen de terceros.")}</p>
            </section>
        </LegalPage>
    )
}
