const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const { execFileSync } = require('node:child_process')

async function main() {
  const dir = path.resolve('public/torneos/galeria')
  let total = 0
  for (const file of fs.readdirSync(dir)) {
    total += fs.statSync(path.join(dir, file)).size
    if (file.endsWith('.webp')) {
      const metadata = await sharp(path.join(dir, file)).metadata()
      assert.equal(metadata.format, 'webp')
      assert.equal(metadata.exif, undefined, `${file} contains EXIF`)
      assert.ok(metadata.width > 0 && metadata.height > 0)
    }
  }
  assert.equal(fs.readdirSync(dir).filter(file => /^foto-\d+\.webp$/.test(file)).length, 15)
  assert.equal(fs.readdirSync(dir).filter(file => file.endsWith('-mini.webp')).length, 15)
  for (const n of [1, 2]) {
    const video = path.join(dir, `video-${n}.mp4`)
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video], { encoding: 'utf8' }))
    assert.equal(probe.streams.find(stream => stream.codec_type === 'video').codec_name, 'h264')
    assert.ok(Number(probe.format.duration) > 7)
    assert.ok(fs.existsSync(path.join(dir, `video-${n}-portada.webp`)))
    assert.ok(fs.statSync(video).size < 4_000_000)
  }
  const component = fs.readFileSync('src/components/tournament-gallery.tsx', 'utf8')
  assert.ok(component.includes('preload="none"'))
  assert.ok(!component.includes('autoPlay'))
  assert.ok(component.includes('object-contain'))
  assert.ok(fs.readFileSync('src/app/(public)/torneos/page.tsx', 'utf8').includes('<TournamentGallery />'))
  console.log(`Gallery OK: 15 photos, 2 H264 videos, previews, no public EXIF, ${(total / 1024 / 1024).toFixed(1)} MB total.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
