import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Sun, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
    title: 'Campus de fútbol',
    description: 'Consulta los próximos campus de fútbol de Academy Costa Brava.'
}

export default async function CampusPage() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('campuses')
        .select('id, name, start_date, end_date, capacity, price')
        .eq('status', 'published')
        .gte('end_date', new Date().toISOString().slice(0, 10))
        .order('start_date')

    const campuses = data || []

    return (
        <div className="min-h-screen bg-navy text-white">
            <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
                <Image src="/campus-hero-daytime.png" alt="Campus de fútbol Academy Costa Brava" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-navy/65" />
                <div className="relative z-10 container text-center py-20">
                    <h1 className="font-heading text-5xl md:text-8xl font-extrabold mb-6 uppercase">Campus de <span className="text-gold">fútbol</span></h1>
                    <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-10">Tecnificación, convivencia y actividades adaptadas a cada convocatoria.</p>
                    <Button asChild size="lg" className="bg-gold text-navy font-bold uppercase">
                        <Link href="#convocatorias">Ver convocatorias</Link>
                    </Button>
                </div>
            </section>

            <section className="container py-20">
                <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                    <div className="relative h-[380px] rounded-3xl overflow-hidden">
                        <Image src="/campus-summer-kids.jpg" alt="Participantes de un campus" fill className="object-cover" />
                    </div>
                    <div>
                        <Sun className="h-10 w-10 text-gold mb-5" />
                        <h2 className="font-heading text-4xl md:text-5xl font-bold mb-5">Una experiencia completa</h2>
                        <p className="text-lg text-gray-300 leading-relaxed">Cada edición se publica con sus fechas, plazas y precio definitivos. Para resolver dudas sobre edades, horarios o material necesario, contacta con la academia.</p>
                    </div>
                </div>

                <div id="convocatorias" className="scroll-mt-24">
                    <h2 className="font-heading text-4xl font-bold text-center mb-10">Próximas convocatorias</h2>
                    {campuses.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campuses.map((campus) => (
                                <Card key={campus.id} className="bg-navy-light border-white/10 text-white">
                                    <CardHeader><CardTitle className="text-gold">{campus.name}</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="flex gap-2 text-gray-300"><Calendar className="h-5 w-5 text-gold" /> {new Date(campus.start_date).toLocaleDateString('es-ES')} – {new Date(campus.end_date).toLocaleDateString('es-ES')}</p>
                                        <p className="flex gap-2 text-gray-300"><Users className="h-5 w-5 text-gold" /> {campus.capacity} plazas</p>
                                        {campus.price !== null && <p className="text-3xl font-bold">{Number(campus.price).toFixed(2)} €</p>}
                                        <Button asChild className="w-full bg-gold text-navy"><Link href="/contacto">Solicitar información</Link></Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto text-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-12">
                            <Calendar className="h-10 w-10 text-gold mx-auto mb-4" />
                            <h3 className="text-2xl font-bold">Aún no hay fechas publicadas</h3>
                            <p className="mt-3 text-gray-300">Escríbenos si quieres recibir información de la próxima edición.</p>
                            <Button asChild className="mt-6 bg-gold text-navy"><Link href="/contacto">Contactar</Link></Button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
