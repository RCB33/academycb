import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ExternalLink, MapPin, Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPublicSettings } from '@/lib/public-settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
    title: 'Torneos y competiciones',
    description: 'Experiencias competitivas en las que Academy Costa Brava participa con sus jugadores.'
}

export default async function TorneosPage() {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)
    const [{ data }, settings] = await Promise.all([
        supabase.from('tournaments_internal').select('id,title,start_date,end_date,location,price,capacity,external_url,status').eq('status', 'open').or(`end_date.is.null,end_date.gte.${today}`).order('start_date'),
        getPublicSettings()
    ])
    const tournaments = data || []
    const resultsUrl = settings.tournaments_url || ''

    return (
        <div className="min-h-screen bg-navy text-white">
            <section className="relative flex min-h-[68svh] items-center justify-center overflow-hidden">
                <Image src="/academy-gallery-6.jpg" alt="Jugadores de Academy Costa Brava unidos antes de competir" fill className="object-cover object-center" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/75 to-navy/55" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy to-transparent" />
                <div className="relative z-10 container text-center py-20">
                    <Trophy className="h-16 w-16 text-gold mx-auto mb-6" />
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-gold">Competimos como equipo</p>
                    <h1 className="mb-6 font-heading text-4xl font-extrabold uppercase tracking-tight sm:text-5xl md:text-8xl">Torneos <span className="text-gold">Academy</span></h1>
                    <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-200 md:text-2xl">Experiencias competitivas en las que nuestros jugadores viajan, compiten y ponen en práctica todo lo aprendido.</p>
                    {resultsUrl && <Button asChild size="lg" className="mt-8 bg-gold text-navy font-bold uppercase"><a href={resultsUrl} target="_blank" rel="noopener noreferrer">Portal de resultados <ExternalLink className="ml-2 h-5 w-5" /></a></Button>}
                </div>
            </section>

            <section className="container py-20">
                {tournaments.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tournaments.map((tournament) => (
                            <Card key={tournament.id} className="bg-navy-light border-white/10 text-white">
                                <CardHeader><CardTitle className="text-gold">{tournament.title}</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {tournament.start_date && <p className="flex gap-2 text-gray-300"><Calendar className="h-5 w-5 text-gold" />{new Date(tournament.start_date).toLocaleDateString('es-ES')}{tournament.end_date ? ` – ${new Date(tournament.end_date).toLocaleDateString('es-ES')}` : ''}</p>}
                                    {tournament.location && <p className="flex gap-2 text-gray-300"><MapPin className="h-5 w-5 text-gold" />{tournament.location}</p>}
                                    <p className="flex gap-2 text-gray-300"><Users className="h-5 w-5 text-gold" />Hasta {tournament.capacity} plazas</p>
                                    {Number(tournament.price) > 0 && <p className="text-3xl font-bold">{Number(tournament.price).toFixed(2)} €</p>}
                                    <Button asChild className="w-full bg-gold text-navy"><Link href={`/inscripcion?service=tournament&activity=${tournament.id}`}>Solicitar plaza</Link></Button>
                                    {tournament.external_url && <Button asChild variant="outline" className="w-full"><a href={tournament.external_url} target="_blank" rel="noopener noreferrer">Información del torneo <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto text-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-12">
                        <Trophy className="h-10 w-10 text-gold mx-auto mb-4" />
                        <h2 className="text-2xl font-bold">No hay torneos abiertos ahora mismo</h2>
                        <p className="mt-3 text-gray-300">Las próximas convocatorias aparecerán aquí cuando estén confirmadas.</p>
                        <Button asChild className="mt-6 bg-gold text-navy"><Link href="/contacto">Recibir información</Link></Button>
                    </div>
                )}
            </section>
        </div>
    )
}
