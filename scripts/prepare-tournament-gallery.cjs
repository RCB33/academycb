// Mechanical web-media preparation. Originals remain unchanged and outside public/.
// Usage: node scripts/prepare-tournament-gallery.cjs <first-attachment-dir> <second-attachment-dir>
const fs = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const sharp = require('sharp')

async function main() {
  const [first, second] = process.argv.slice(2)
  if (!first || !second) throw Error('Pass both attachment directories')
  const originals = path.resolve('assets/torneos/galeria/originales')
  const output = path.resolve('public/torneos/galeria')
  await fs.mkdir(originals, { recursive: true })
  await fs.mkdir(output, { recursive: true })
  for (let n = 1; n <= 15; n++) {
    const sourceNumber = n <= 10 ? n : n - 10
    const source = path.join(n <= 10 ? first : second, `${sourceNumber}-Foto-${sourceNumber}.jpg`)
    const name = `foto-${String(n).padStart(2, '0')}`
    await fs.copyFile(source, path.join(originals, `${name}.jpg`))
    // autoOrient and default metadata removal avoid exposing GPS/EXIF publicly.
    await sharp(source).autoOrient().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(output, `${name}.webp`))
    await sharp(source).autoOrient().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(output, `${name}-mini.webp`))
  }
  const videos = ['6-953605cf-8d35-436b-a4ff-943f4d2ab136.mov', '7-1e9fb5c7-1fc3-4493-98e2-c0befe7a1f91.mov']
  for (const [index, file] of videos.entries()) {
    const source = path.join(second, file), name = `video-${index + 1}`
    await fs.copyFile(source, path.join(originals, `${name}.mov`))
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-map_metadata', '-1', '-c:v', 'libx264', '-preset', 'medium', '-crf', '28', '-maxrate', '1400k', '-bufsize', '2800k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', path.join(output, `${name}.mp4`)], { stdio: 'inherit' })
    const poster = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', '1', '-i', source, '-frames:v', '1', '-vf', 'scale=640:-2', '-map_metadata', '-1', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { maxBuffer: 10_000_000 })
    await sharp(poster).webp({ quality: 80 }).toFile(path.join(output, `${name}-portada.webp`))
  }
  console.log('Prepared 15 photos, 2 videos and lightweight previews. Originals preserved.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
