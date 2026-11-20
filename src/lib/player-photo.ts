import 'server-only'
import sharp from 'sharp'

/** Decode and re-encode rather than trusting the filename or MIME header. Removes EXIF. */
export async function preparePlayerPhoto(file: File) {
    if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 3 * 1024 * 1024) {
        throw new Error('Selecciona una foto JPG, PNG o WebP de hasta 3 MB.')
    }
    try {
        const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000, animated: false })
        const metadata = await image.metadata()
        if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error('Formato no válido')
        return await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
    } catch {
        throw new Error('No se pudo leer la foto. Prueba con otra imagen JPG, PNG o WebP.')
    }
}
