import { Target, ShieldCheck, Users } from "lucide-react"

export default function WhoWeAreSection() {
    const points = [
        {
            title: "Nuestra Misión",
            icon: Target,
            description: "Acompañar a jóvenes futbolistas con una formación que combina técnica, táctica, hábitos deportivos y desarrollo personal.",
            color: "text-gold"
        },
        {
            title: "Nuestros Valores",
            icon: ShieldCheck,
            description: "Disciplina, Respeto, Esfuerzo, Humildad y Ambición. Estos son los pilares sobre los que construimos cada entrenamiento, cada partido y cada relación en nuestra academia.",
            color: "text-secondary"
        },
        {
            title: "Nuestro Objetivo",
            icon: Users,
            description: "Crear un entorno cercano y exigente donde cada jugador pueda aprender, disfrutar y progresar a su ritmo.",
            color: "text-white"
        }
    ]

    return (
        <section className="py-24 bg-navy relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary rounded-full blur-[120px]" />
            </div>

            <div className="container relative z-10">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-bold text-gold backdrop-blur-md mb-4 tracking-widest uppercase">
                        Conócenos mejor
                    </span>
                    <h2 className="font-heading text-5xl md:text-7xl font-bold text-white mb-6 uppercase">
                        Quiénes <span className="text-gold">Somos</span>
                    </h2>
                    <div className="w-24 h-1.5 bg-gold mx-auto rounded-full"></div>
                </div>

                <div className="grid md:grid-cols-3 gap-12">
                    {points.map((point, index) => (
                        <div key={index} className="group relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 to-secondary/20 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative flex flex-col items-center text-center p-8 bg-navy-light/40 backdrop-blur-sm border border-white/5 rounded-2xl hover:border-gold/30 transition-all h-full">
                                <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform`}>
                                    <point.icon className={`h-8 w-8 ${point.color}`} />
                                </div>
                                <h3 className="font-heading text-2xl font-bold text-white mb-4 uppercase tracking-wide">{point.title}</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {point.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    )
}
