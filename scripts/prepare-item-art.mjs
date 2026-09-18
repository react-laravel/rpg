import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const version = 'redesign-20260919'
const cataloguePath = path.join(root, 'output/item-art/catalogue.json')
const manifestPath = path.join(root, 'output/item-art/manifest.json')
const outputDirectory = path.join(root, 'public/game/rpg/items', version)
const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'))
let manifest
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  manifest = { version, generator: 'built-in image_gen', assets: {} }
}
if (manifest.version !== version) throw new Error('资源版本与清单不一致')

async function inspect(file) {
  const metadata = await sharp(file).metadata()
  if (metadata.format !== 'png' || !metadata.hasAlpha) {
    throw new Error(`图片必须为自带透明通道的 PNG: ${file}`)
  }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0
  let visible = 0
  let partial = 0
  for (let offset = 3; offset < data.length; offset += info.channels) {
    if (data[offset] === 0) transparent++
    else if (data[offset] >= 240) visible++
    else partial++
  }
  const pixels = info.width * info.height
  if (transparent / pixels < 0.1 || visible / pixels < 0.005) {
    throw new Error(`图片缺少真实透明背景或可见主体: ${file}`)
  }
  return {
    width: info.width,
    height: info.height,
    transparent_ratio: Number((transparent / pixels).toFixed(4)),
    antialiased_ratio: Number((partial / pixels).toFixed(4)),
  }
}

async function describe(file) {
  const bytes = await readFile(file)
  return {
    file: path.relative(root, file),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    ...(await inspect(file)),
  }
}

const [assetKey, sourcePath] = process.argv.slice(2)
if (assetKey === '--status' || assetKey === '--verify-all') {
  const missing = catalogue.filter(item => !manifest.assets[item.asset_key])
  if (assetKey === '--verify-all') {
    if (missing.length > 0) throw new Error(`尚缺 ${missing.length} 张图片，禁止切换整套资源`)
    for (const item of catalogue) {
      for (const kind of ['icon', 'origin']) {
        const expected = manifest.assets[item.asset_key][kind]
        const actual = await describe(path.join(root, expected.file))
        if (actual.sha256 !== expected.sha256) throw new Error(`文件校验失败: ${expected.file}`)
        const size = kind === 'icon' ? 256 : 1024
        if (actual.width !== size || actual.height !== size) throw new Error(`图片尺寸不正确: ${expected.file}`)
      }
    }
  }
  console.log(JSON.stringify({ total: catalogue.length, completed: catalogue.length - missing.length, missing: missing.map(item => ({ key: item.asset_key, name: item.name })) }, null, 2))
} else {
  const item = catalogue.find(candidate => candidate.asset_key === assetKey)
  if (!item || !sourcePath) throw new Error('用法: node scripts/prepare-item-art.mjs <资源标识> <生成的PNG路径>')
  const source = path.resolve(sourcePath)
  await inspect(source)
  await mkdir(outputDirectory, { recursive: true })
  const originPath = path.join(outputDirectory, item.origin_filename)
  const iconPath = path.join(outputDirectory, item.filename)
  for (const [destination, size] of [[originPath, 1024], [iconPath, 256]]) {
    // 只统一尺寸与压缩；保留生图自带的 alpha，不用背景色替代透明度。
    const bytes = await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    await writeFile(destination, bytes)
  }
  manifest.assets[assetKey] = {
    id: item.id,
    name: item.name,
    source,
    origin: await describe(originPath),
    icon: await describe(iconPath),
  }
  const temporaryManifest = `${manifestPath}.tmp`
  await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`)
  await rename(temporaryManifest, manifestPath)
  console.log(JSON.stringify({ name: item.name, completed: Object.keys(manifest.assets).length, total: catalogue.length, ...manifest.assets[assetKey] }, null, 2))
}
