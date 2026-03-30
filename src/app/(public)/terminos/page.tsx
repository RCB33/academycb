import { FileText } from "lucide-react"

export default function TerminosPage() {
    return (
        <div className="max-w-4xl mx-auto py-24 px-6 md:px-12 text-slate-700">
            <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <FileText className="text-indigo-600" />
                Condiciones Generales de la Academia
            </h1>
            <div className="prose prose-slate max-w-none">
                <p>Las presentes condiciones regulan el uso de los servicios de la academia deportiva. Se recomienda leer detenidamente antes de formalizar la inscripción.</p>
                
                <h3>1. Objeto y Ámbito de Aplicación</h3>
                <p>El objeto de este documento es establecer las normas de comportamiento, pagos y derechos de imagen para todos los jugadores inscritos en la academia.</p>
                
                <h3>2. Obligaciones y Comportamiento (Fair Play)</h3>
                <p>Se espera de todos los jugadores un comportamiento ejemplar tanto dentro como fuera del campo. El respeto a los compañeros, entrenadores y árbitros es innegociable.</p>

                <h3>3. Cuotas y Pagos</h3>
                <p>Las cuotas deberán ser abonadas del 1 al 5 de cada mes. En caso de impago reincidente, la academia se reserva el derecho de suspender la participación del alumno.</p>
                
                <h3>4. Derechos de Imagen</h3>
                <p>Al firmar el consentimiento, los tutores legales autorizan a la academia al uso de las fotografías y vídeos tomados durante entrenamientos y partidos para uso exclusivo en la plataforma interna (Videoteca) y redes oficiales de la academia.</p>
            </div>
        </div>
    )
}
