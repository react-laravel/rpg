import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const work = path.join(root, 'output/pixel-rpg')
const output = path.join(root, 'public/game/rpg/pixel-v1')
const slots = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'ring', 'amulet']
const labels = ['法杖', '头饰', '衣服', '手套', '靴子', '腰带', '戒指', '护符']
const setAliases = { earth: 'apprentice', wood: 'moonlight', water: 'starlight', fire: 'arcane', metal: 'sky', wind: 'forbidden', thunder: 'eternal' }
const setNames = { earth: '磐石', wood: '青藤', water: '沧澜', fire: '烈阳', metal: '鎏金', wind: '流风', thunder: '雷霆' }
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'))
await fs.mkdir(path.join(work, 'sources'), { recursive: true })
await fs.mkdir(output, { recursive: true })
const sources = await read(path.join(work, 'equipment-sources.json'))
const catalogue = await read(path.join(root, 'output/item-art/catalogue.json'))
const namesByKey = Object.fromEntries(catalogue.map(item => [item.asset_key, item.name]))
const jobs = sources.map(s => ({ ...s, id: `equipment-${s.key}`, kind: 'items', cols: 4, rows: 2, tileSize: 64,
  tiles: slots.map((slot, index) => ({ key: `${s.key}-${slot}`, name: namesByKey[`mage-set-${setAliases[s.key]}-${slot}`] ?? `${setNames[s.key]}${labels[index]}`, set: s.key, slot,
    aliases: [`mage-set-${setAliases[s.key]}-${slot}`] })) }))
for (const file of (await fs.readdir(path.join(work, 'jobs'))).sort()) {
  if (file.endsWith('.json')) jobs.push(await read(path.join(work, 'jobs', file)))
}

// 用透明区域的连通分量分组，不依赖 AI 生成的网格恰好落在整像素边界。
function components(data, width, height, cols, rows) {
  const seen = new Uint8Array(width * height)
  const componentIds = new Int32Array(width * height)
  const queue = new Int32Array(width * height)
  const groups = Array.from({ length: cols * rows }, () => [])
  let nextId = 0
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] < 128) continue
    let head = 0, tail = 1, sumX = 0, sumY = 0, minX = width, maxX = 0, minY = height, maxY = 0
    queue[0] = start; seen[start] = 1; const id = ++nextId
    while (head < tail) {
      const p = queue[head++], x = p % width, y = Math.floor(p / width)
      componentIds[p] = id; sumX += x; sumY += y
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      const adjacent = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1]
      for (const n of adjacent) if (n >= 0 && !seen[n] && data[n * 4 + 3] >= 128) { seen[n] = 1; queue[tail++] = n }
    }
    if (tail < 12) continue
    const col = Math.min(cols - 1, Math.floor(sumX / tail / width * cols))
    const row = Math.min(rows - 1, Math.floor(sumY / tail / height * rows))
    groups[row * cols + col].push({ id, area: tail, minX, maxX, minY, maxY })
  }
  return { groups, componentIds }
}

const manifest = { version: 'pixel-v1', ready: false, items: {}, monsters: {}, maps: {}, assets: [], sheets: [] }
const warnings = []
for (const job of jobs) {
  if (!job.source) continue
  const localSource = path.join(work, 'sources', `${job.id}.png`)
  const sourcePath = path.resolve(root, job.source)
  if (sourcePath !== localSource) {
    try { await fs.copyFile(sourcePath, localSource) } catch (error) {
      if (error.code !== 'ENOENT') throw error
      await fs.access(localSource)
    }
  }
  const { data, info } = await sharp(localSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  let segmented
  if (job.kind !== 'maps') {
    if (!data.some((value, index) => index % 4 === 3 && value === 0)) throw new Error(`${job.id}: 缺少透明背景`)
    segmented = components(data, width, height, job.cols, job.rows)
  }
  await fs.mkdir(path.join(output, job.kind), { recursive: true })
  for (let index = 0; index < job.tiles.length; index++) {
    const tile = job.tiles[index]
    let frame, bytes
    if (job.kind === 'maps') {
      const col = index % job.cols, row = Math.floor(index / job.cols)
      const left = Math.round(col * width / job.cols), top = Math.round(row * height / job.rows)
      frame = { left, top, width: Math.round((col + 1) * width / job.cols) - left, height: Math.round((row + 1) * height / job.rows) - top }
      bytes = await sharp(localSource).extract(frame).resize(job.tileSize, job.tileSize, { kernel: 'nearest', fit: 'fill' }).removeAlpha().png({ palette: true, colours: 128, dither: 0 }).toBuffer()
    } else {
      const group = segmented.groups[index]
      if (!group.length) throw new Error(`${job.id}/${tile.key}: 单元格为空`)
      const minX = Math.min(...group.map(c => c.minX)), maxX = Math.max(...group.map(c => c.maxX))
      const minY = Math.min(...group.map(c => c.minY)), maxY = Math.max(...group.map(c => c.maxY))
      frame = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      if (frame.width > width / job.cols * 1.3 || frame.height > height / job.rows * 1.3) throw new Error(`${job.id}/${tile.key}: 连通分量跨越多个格子`)
      if (minX === 0 || minY === 0 || maxX === width - 1 || maxY === height - 1) warnings.push(`${job.id}/${tile.key}: 源图主体接触画布边缘，请检查`)
      const allowed = new Set(group.map(c => c.id)), isolated = Buffer.alloc(frame.width * frame.height * 4)
      for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
        const sourceIndex = (y + minY) * width + x + minX
        if (!allowed.has(segmented.componentIds[sourceIndex])) continue
        const dest = (y * frame.width + x) * 4
        isolated[dest] = data[sourceIndex * 4]; isolated[dest + 1] = data[sourceIndex * 4 + 1]; isolated[dest + 2] = data[sourceIndex * 4 + 2]; isolated[dest + 3] = 255
      }
      bytes = await sharp(isolated, { raw: { width: frame.width, height: frame.height, channels: 4 } })
        .resize(job.tileSize - 4, job.tileSize - 4, { kernel: 'nearest', fit: 'contain', background: '#00000000' })
        .extend({ top: 2, bottom: 2, left: 2, right: 2, background: '#00000000' })
        .png({ palette: true, colours: 48, dither: 0 }).toBuffer()
    }
    const file = `${job.kind}/${tile.key}.png`
    await fs.writeFile(path.join(output, file), bytes)
    const url = `/game/rpg/pixel-v1/${file}`
    for (const alias of new Set([tile.key, ...(tile.aliases ?? [])])) {
      for (const ext of ['png', 'jpg', 'jpeg', 'webp']) manifest[job.kind][`${alias}.${ext}`] = url
    }
    manifest.assets.push({ ...tile, kind: job.kind, file, url, size: job.tileSize, source: `output/pixel-rpg/sources/${job.id}.png`, frame,
      sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length })
  }
  manifest.sheets.push({ id: job.id, count: job.tiles.length, source: `output/pixel-rpg/sources/${job.id}.png`, prompt: job.prompt })
}

manifest.assets.sort((a, b) => {
  const order = { items: 0, monsters: 1, maps: 2 }
  return order[a.kind] - order[b.kind] || (a.kind === 'items' ? 0 : (a.ordinal ?? 0) - (b.ordinal ?? 0))
})
const expected = { items: 110, monsters: 123, maps: 41 }
const counts = Object.fromEntries(Object.keys(expected).map(kind => [kind, manifest.assets.filter(a => a.kind === kind).length]))
manifest.ready = Object.keys(expected).every(kind => counts[kind] === expected[kind])
manifest.counts = counts
manifest.warnings = warnings
await fs.writeFile(path.join(work, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const runtime = Object.fromEntries(['version', 'ready', 'items', 'monsters', 'maps'].map(key => [key, manifest[key]]))
await fs.writeFile(path.join(root, 'app/game/rpg/data/pixel-asset-manifest.json'), JSON.stringify(runtime, null, 2) + '\n')

// 固定格子总图保留原生分辨率；浏览器用 nearest-neighbor 展示。
for (const kind of ['items', 'monsters', 'maps']) {
  const list = manifest.assets.filter(a => a.kind === kind)
  if (!list.length) continue
  const size = kind === 'items' ? 64 : kind === 'monsters' ? 96 : 256
  const cols = kind === 'items' ? 8 : kind === 'monsters' ? 12 : 7
  const layers = await Promise.all(list.map(async (a, i) => ({ input: await fs.readFile(path.join(output, a.file)), left: i % cols * size, top: Math.floor(i / cols) * size })))
  await sharp({ create: { width: cols * size, height: Math.ceil(list.length / cols) * size, channels: 4, background: '#00000000' } }).composite(layers).png().toFile(path.join(output, `${kind}-atlas.png`))
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RPG 像素资源</title><style>body{margin:0;background:#151a24;color:#e4e9f3;font:14px system-ui}header,main{max-width:1400px;margin:auto;padding:20px}nav{display:flex;gap:8px;flex-wrap:wrap}button{background:#2d374a;color:inherit;border:1px solid #556278;padding:10px 20px;border-radius:8px;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}.card{border:1px solid #354154;border-radius:8px;background:#202734;text-align:center;padding:12px}.card img{width:112px;height:112px;object-fit:contain;image-rendering:pixelated}.card[data-kind=maps] img{width:100%;height:auto;aspect-ratio:1}.card small{display:block;color:#a1adc0}h1{font-size:24px}.light .card{background:#e8e7e0;color:#1e2630}</style><header><h1>RPG 像素资源</h1><p>装备 ${counts.items}/110 · 怪物 ${counts.monsters}/123 · 地图 ${counts.maps}/41</p><nav><button onclick="filter('items')">装备</button><button onclick="filter('monsters')">怪物</button><button onclick="filter('maps')">地图</button><button onclick="document.body.classList.toggle('light')">切换明暗背景</button></nav></header><main><div class="grid">${manifest.assets.map(a => `<article class="card" data-kind="${a.kind}"><img src="${a.file}" alt="${escape(a.name)}"><p>${escape(a.name)}</p><small>${a.size} × ${a.size}</small></article>`).join('')}</div></main><script>function filter(kind){document.querySelectorAll('.card').forEach(c=>c.hidden=c.dataset.kind!==kind)}filter('items')</script></html>`
await fs.writeFile(path.join(output, 'preview.html'), html)
const task = await read(path.join(work, 'task.json'))
task.generated = manifest.sheets.map(s => ({ id: s.id, count: s.count }))
task.processed = counts; task.assetReady = manifest.ready; task.warnings = warnings; task.updatedAt = new Date().toISOString()
await fs.writeFile(path.join(work, 'task.json'), JSON.stringify(task, null, 2) + '\n')
console.log(JSON.stringify({ counts, ready: manifest.ready, warnings, sheets: manifest.sheets.length }, null, 2))
if (process.argv.includes('--verify') && (!manifest.ready || warnings.length)) process.exitCode = 1
