import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'output/pixel-rpg/characters')
const output = path.join(root, 'public/game/rpg/pixel-v1/characters')
const outfits = ['base', 'cloth', 'earth', 'wood', 'water', 'fire', 'metal', 'wind', 'thunder']
const sourceHands = {
  male: [[178, 225], [538, 234], [898, 230], [174, 663], [529, 665], [897, 666], [175, 1079], [538, 1081], [897, 1085]],
  female: [[115, 226], [513, 233], [914, 236], [106, 647], [508, 649], [913, 649], [103, 1065], [510, 1069], [912, 1069]],
}
const width = 192, height = 224
const manifest = { width, height, portraits: {}, weapons: {}, assets: [] }
await fs.mkdir(output, { recursive: true })

// Assign complete connected shapes by their centre, even when hair or fabric crosses a grid line.
function splitSprites(data, imageWidth, imageHeight) {
  const seen = new Uint8Array(imageWidth * imageHeight)
  const ids = new Int32Array(seen.length), queue = new Int32Array(seen.length)
  const groups = Array.from({ length: 9 }, () => [])
  let id = 0
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] < 128) continue
    let head = 0, count = 1, sumX = 0, sumY = 0, left = imageWidth, top = imageHeight, right = 0, bottom = 0
    queue[0] = start; seen[start] = 1; id++
    while (head < count) {
      const p = queue[head++], x = p % imageWidth, y = Math.floor(p / imageWidth)
      ids[p] = id; sumX += x; sumY += y
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
      for (const n of [x > 0 ? p - 1 : -1, x < imageWidth - 1 ? p + 1 : -1, y > 0 ? p - imageWidth : -1, y < imageHeight - 1 ? p + imageWidth : -1]) {
        if (n >= 0 && !seen[n] && data[n * 4 + 3] >= 128) { seen[n] = 1; queue[count++] = n }
      }
    }
    if (count < 12) continue
    const col = Math.min(2, Math.floor(sumX / count / imageWidth * 3))
    const row = Math.min(2, Math.floor(sumY / count / imageHeight * 3))
    groups[row * 3 + col].push({ id, left, top, right, bottom })
  }
  return { groups, ids }
}

async function save(file, bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let opaque = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3]
    if (alpha !== 0 && alpha !== 255) throw new Error(`${file}: non-binary alpha`)
    if (alpha) {
      opaque++
      if (x < 2 || y < 2 || x >= info.width - 2 || y >= info.height - 2) throw new Error(`${file}: clipped edge`)
    }
  }
  if (opaque < 100) throw new Error(`${file}: empty sprite`)
  await fs.writeFile(path.join(output, file), bytes)
  manifest.assets.push({ file, width: info.width, height: info.height, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}

for (const gender of ['male', 'female']) {
  const source = path.join(sourceRoot, 'sources', `${gender}.png`)
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (!data.some((v, i) => i % 4 === 3 && v === 0)) throw new Error(`${gender}: missing transparency`)
  const { groups, ids } = splitSprites(data, info.width, info.height)
  for (let i = 0; i < outfits.length; i++) {
    const group = groups[i], allowed = new Set(group.map(c => c.id))
    const minX = Math.min(...group.map(c => c.left)), minY = Math.min(...group.map(c => c.top))
    const maxX = Math.max(...group.map(c => c.right)), maxY = Math.max(...group.map(c => c.bottom))
    const frame = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
    if (frame.width < 30 || frame.height < 100) throw new Error(`${gender}/${outfits[i]}: invalid crop`)
    const crop = await sharp(source).extract(frame).ensureAlpha().raw().toBuffer()
    for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
      crop[(y * frame.width + x) * 4 + 3] = allowed.has(ids[(y + minY) * info.width + x + minX]) ? 255 : 0
    }
    const scale = Math.min(176 / frame.width, 208 / frame.height)
    const targetWidth = Math.round(frame.width * scale), targetHeight = Math.round(frame.height * scale)
    const offsetX = Math.floor((width - targetWidth) / 2), offsetY = height - 8 - targetHeight
    const bytes = await sharp(crop, { raw: { width: frame.width, height: frame.height, channels: 4 } })
      .resize(targetWidth, targetHeight, { kernel: 'nearest' })
      .extend({ left: offsetX, right: width - targetWidth - offsetX, top: offsetY, bottom: 8, background: '#00000000' })
      .png({ palette: true, colours: 64, dither: 0 }).toBuffer()
    const file = `${gender}-${outfits[i]}.png`
    await save(file, bytes)
    const [handX, handY] = sourceHands[gender][i]
    manifest.portraits[`${gender}-${outfits[i]}`] = {
      hand: [Math.round(offsetX + (handX - minX) * scale), Math.round(offsetY + (handY - minY) * scale)],
      frame,
    }
    if (i === 0) {
      // The top of the base sprite contains the same face used by every outfit.
      const avatar = await sharp(bytes).extract({ left: 56, top: 8, width: 80, height: 80 })
        .resize(88, 88, { kernel: 'nearest' }).extend({ top: 4, bottom: 4, left: 4, right: 4, background: '#00000000' })
        .png({ palette: true, colours: 64, dither: 0 }).toBuffer()
      await save(`${gender}-avatar.png`, avatar)
    }
  }
}

const items = JSON.parse(await fs.readFile(path.join(root, 'output/item-art/catalogue.json'), 'utf8'))
const pixel = JSON.parse(await fs.readFile(path.join(root, 'output/pixel-rpg/manifest.json'), 'utf8'))
for (const item of items.filter(i => i.type === 'weapon')) {
  const url = pixel.items[`${item.asset_key}.png`]
  if (!url) throw new Error(`Missing weapon sprite: ${item.asset_key}`)
  const { data, info } = await sharp(path.join(root, 'public', url)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const gripY = 42
  const xs = []
  for (let y = gripY - 1; y <= gripY + 1; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) xs.push(x)
  xs.sort((a, b) => a - b)
  manifest.weapons[url] = { grip: [(xs[Math.floor(xs.length / 2)] ?? 32) / info.width, gripY / info.height], angle: item.asset_key.startsWith('mage-set-') ? 0 : -30 }
}
await fs.writeFile(path.join(sourceRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
await fs.writeFile(path.join(root, 'app/game/rpg/data/character-appearance-manifest.json'), JSON.stringify({ width, height, portraits: manifest.portraits, weapons: manifest.weapons }, null, 2) + '\n')
console.log(JSON.stringify({ portraits: Object.keys(manifest.portraits).length, weapons: Object.keys(manifest.weapons).length, assets: manifest.assets.length, bytes: manifest.assets.reduce((sum, a) => sum + a.bytes, 0) }))
