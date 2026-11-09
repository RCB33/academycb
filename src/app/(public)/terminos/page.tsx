
import { getT } from '@/lib/i18n/server'
import { translateMetadata } from '@/lib/i18n/translate'
import { LegalPage } from '../components/legal-page'

export async function generateMetadata() {
    const translate = await getT()
    return translateMetadata({
    title: 'Condiciones generales',
    description: 'Condiciones generales de participación y uso de los servicios de Academy Costa Brava.'
}, translate)
}

export default async function TerminosPage() {
    const translate = await getT()

    return (
        <LegalPage title={translate("Condiciones generales")}>
            <section>
                <h2>{translate("1. Ámbito")}</h2>
                <p>{translate("Estas condiciones establecen unas reglas generales para la participación en actividades de la academia. Las fechas, horarios, precios, edades, plazas y condiciones particulares válidas son las comunicadas para cada inscripción.")}</p>
            </section>
            <section>
                <h2>{translate("2. Inscripción y pagos")}</h2>
                <p>{translate("La plaza se considera confirmada cuando la academia acepta la inscripción y se cumplen las condiciones de pago comunicadas. Cualquier política de cancelación o devolución deberá constar en la convocatoria o documento de inscripción correspondiente.")}</p>
            </section>
            <section>
                <h2>{translate("3. Salud, seguridad y convivencia")}</h2>
                <p>{translate("Los tutores deben informar de circunstancias médicas, alergias o necesidades relevantes. Los participantes deben respetar a compañeros, personal, instalaciones y normas de seguridad. La academia podrá adoptar medidas proporcionadas ante conductas graves o reiteradas.")}</p>
            </section>
            <section>
                <h2>{translate("4. Imágenes y comunicaciones")}</h2>
                <p>{translate("El tratamiento o publicación de fotografías y vídeos se regirá por la autorización específica otorgada por los tutores. Las comunicaciones operativas se enviarán por los canales facilitados durante la inscripción.")}</p>
            </section>
            <section>
                <h2>{translate("5. Condiciones particulares")}</h2>
                <p>{translate("En caso de diferencia, prevalecen las condiciones particulares aceptadas para la actividad concreta. La academia deberá facilitar una copia o acceso duradero a las condiciones aceptadas.")}</p>
            </section>
        </LegalPage>
    )
}
