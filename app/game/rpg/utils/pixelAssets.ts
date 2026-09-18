import manifest from '../data/pixel-asset-manifest.json'

type AssetKind = 'items' | 'monsters' | 'maps'

/** 同时兼容旧 CDN 地址、编号文件名和新版资源键；资源齐全后才统一切换。 */
export function getPixelAssetUrl(kind: AssetKind, source?: string | null): string | null {
  if (!manifest.ready || !source) return null
  const filename = source.split(/[?#]/, 1)[0].split('/').pop()?.replace(/_origin(?=\.)/, '')
  if (!filename) return null
  return (manifest[kind] as Record<string, string>)[filename] ?? null
}
