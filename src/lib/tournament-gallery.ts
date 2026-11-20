export type GalleryMedia = {
  id: string
  type: 'photo' | 'video'
  src: string
  preview: string
  title: { es: string; ca: string; en: string }
  duration?: string
}
const base = '/torneos/galeria'
const photo = (number: number, es: string, ca: string, en: string): GalleryMedia => {
  const id = `foto-${String(number).padStart(2, '0')}`
  return { id, type: 'photo', src: `${base}/${id}.webp`, preview: `${base}/${id}-mini.webp`, title: { es, ca, en } }
}
export const tournamentGallery: GalleryMedia[] = [
  photo(11, 'Preparados para competir', 'Preparats per competir', 'Ready to compete'),
  { id: 'video-1', type: 'video', src: `${base}/video-1.mp4`, preview: `${base}/video-1-portada.webp`, title: { es: 'Momentos de torneo', ca: 'Moments de torneig', en: 'Tournament moments' }, duration: '0:08' },
  photo(13, 'Juntos en la Costa Brava Cup', 'Junts a la Costa Brava Cup', 'Together at the Costa Brava Cup'),
  photo(15, 'Ilusión bajo los palos', 'Il·lusió sota els pals', 'Passion between the posts'),
  photo(6, 'La experiencia Donosti Cup', "L’experiència Donosti Cup", 'The Donosti Cup experience'),
  { id: 'video-2', type: 'video', src: `${base}/video-2.mp4`, preview: `${base}/video-2-portada.webp`, title: { es: 'Vivir el fútbol en equipo', ca: 'Viure el futbol en equip', en: 'Enjoying football together' }, duration: '0:17' },
  photo(14, 'El fútbol también es compañerismo', 'El futbol també és companyonia', 'Football is also about friendship'),
  photo(4, 'Un equipo dentro y fuera del campo', 'Un equip dins i fora del camp', 'A team on and off the pitch'),
  photo(1, 'Compartiendo el viaje', 'Compartint el viatge', 'Sharing the journey'),
  photo(2, 'Representando nuestros colores', 'Representant els nostres colors', 'Representing our colours'),
  photo(3, 'Un descanso entre experiencias', 'Un descans entre experiències', 'A rest between experiences'),
  photo(5, 'Recuerdos más allá del campo', 'Records més enllà del camp', 'Memories beyond the pitch'),
  photo(7, 'Recuerdos de la Donosti Cup', 'Records de la Donosti Cup', 'Donosti Cup memories'),
  photo(8, 'Encuentros que ilusionan', 'Trobades que il·lusionen', 'Inspiring encounters'),
  photo(9, 'Rumbo a una nueva experiencia', 'Rumb a una nova experiència', 'On the way to a new experience'),
  photo(10, 'El viaje forma parte del equipo', 'El viatge forma part de l’equip', 'The journey is part of the team'),
  photo(12, 'Trofeos de la Costa Brava Cup', 'Trofeus de la Costa Brava Cup', 'Costa Brava Cup trophies'),
]
