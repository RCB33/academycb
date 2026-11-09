
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import { LegalPage } from '../components/legal-page'

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({
    title: 'Autorización de imagen y vídeo',
    description: 'Información sobre la autorización opcional de uso de imagen y vídeo de jugadores menores.',
}, translate)
}

export default async function ImageAuthorizationPage() {
    const translate = await getT()

    return <LegalPage title={translate("Autorización de imagen y vídeo")}>
        <section>
            <h2>{translate("1. Decisión opcional y por jugador")}</h2>
            <p>{translate("La autorización de imagen y vídeo es voluntaria y no condiciona la inscripción, la plaza ni la participación deportiva. El tutor legal puede decidir de forma independiente para cada jugador y para cada finalidad indicada.")}</p>
        </section>
        <section>
            <h2>{translate("2. Finalidades disponibles")}</h2>
            <ul>
                <li><strong>{translate("Uso interno privado:")}</strong> {translate(" Portal Familias, Videoteca y Muro Academy.")}</li>
                <li><strong>{translate("Comunicación pública:")}</strong> {translate(" página web, redes sociales, prensa, cartelería y materiales promocionales de la academia.")}</li>
            </ul>
            <p>{translate("La autorización solo cubre las opciones expresamente marcadas y firmadas por el tutor legal.")}</p>
        </section>
        <section>
            <h2>{translate("3. Retirada o modificación")}</h2>
            <p>{translate("El tutor puede modificar o retirar la autorización desde Portal Familias, en el apartado Autorizaciones. La academia dejará de utilizar el contenido en nuevas publicaciones y revisará los contenidos propios ya publicados conforme al alcance de la retirada.")}</p>
        </section>
        <section>
            <h2>{translate("4. Registro de la decisión")}</h2>
            <p>{translate("La decisión se conserva con el jugador, tutor, opciones elegidas, fecha, versión del documento y datos técnicos necesarios para acreditar la aceptación. El documento firmado se puede consultar desde Mis documentos.")}</p>
        </section>
    </LegalPage>
}
