import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ExternalLink, MapPin, Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPublicSettings } from '@/lib/public-settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
    title: 'Torneos y competiciones',
    description: 'Próximos torneos y competiciones organizados por Academy Costa Brava.'
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
            <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
                <Image src="/tournament-hero.png" alt="Torneos Academy Costa Brava" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-navy/70" />
                <div className="relative z-10 container text-center py-20">
                    <Trophy className="h-16 w-16 text-gold mx-auto mb-6" />
                    <h1 className="font-heading text-5xl md:text-8xl font-extrabold tracking-tight mb-6 uppercase">Torneos y <span className="text-gold">competiciones</span></h1>
                    <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">Consulta aquí únicamente las convocatorias confirmadas por la academia.</p>
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
                                    <p className="flex gap-2 text-gray-300"><Users className="h-5 w-5 text-gold" />Hasta {tournament.capacity} equipos</p>
                                    {Number(tournament.price) > 0 && <p className="text-3xl font-bold">{Number(tournament.price).toFixed(2)} €</p>}
                                    <Button asChild className="w-full bg-gold text-navy"><Link href={`/inscripcion?service=tournament&activity=${tournament.id}`}>Solicitar plaza</Link></Button>
                                    {tournament.external_url && <Button asChild variant="outline" className="w-full"><a href={tournament.external_url} target="_blank" rel="noopener noreferrer">Web del torneo <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
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
