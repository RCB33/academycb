import { LegalPage } from '../components/legal-page'

export const metadata = {
    title: 'Autorización de imagen y vídeo',
    description: 'Información sobre la autorización opcional de uso de imagen y vídeo de jugadores menores.',
}

export default function ImageAuthorizationPage() {
    return <LegalPage title="Autorización de imagen y vídeo">
        <section>
            <h2>1. Decisión opcional y por jugador</h2>
            <p>La autorización de imagen y vídeo es voluntaria y no condiciona la inscripción, la plaza ni la participación deportiva. El tutor legal puede decidir de forma independiente para cada jugador y para cada finalidad indicada.</p>
        </section>
        <section>
            <h2>2. Finalidades disponibles</h2>
            <ul>
                <li><strong>Uso interno privado:</strong> Portal Familias, Videoteca y Muro Academy.</li>
                <li><strong>Comunicación pública:</strong> página web, redes sociales, prensa, cartelería y materiales promocionales de la academia.</li>
            </ul>
            <p>La autorización solo cubre las opciones expresamente marcadas y firmadas por el tutor legal.</p>
        </section>
        <section>
            <h2>3. Retirada o modificación</h2>
            <p>El tutor puede modificar o retirar la autorización desde Portal Familias, en el apartado Autorizaciones. La academia dejará de utilizar el contenido en nuevas publicaciones y revisará los contenidos propios ya publicados conforme al alcance de la retirada.</p>
        </section>
        <section>
            <h2>4. Registro de la decisión</h2>
            <p>La decisión se conserva con el jugador, tutor, opciones elegidas, fecha, versión del documento y datos técnicos necesarios para acreditar la aceptación. El documento firmado se puede consultar desde Mis documentos.</p>
        </section>
    </LegalPage>
}
