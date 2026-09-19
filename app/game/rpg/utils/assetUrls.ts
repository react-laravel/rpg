import { gameAsset } from '@/lib/helpers/assets'
import { getPixelAssetUrl } from './pixelAssets'

function addOriginSuffix(fileName: string): string {
  return fileName.replace(/\.([^.]+)$/, '_origin.$1')
}

function resolveRpgAssetUrl(baseDir: string, fileName?: string | null, useOrigin = false): string {
  if (fileName) {
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
      return useOrigin ? addOriginSuffix(fileName) : fileName
    }
    const resolvedName = useOrigin ? addOriginSuffix(fileName) : fileName
    return gameAsset(fileName.startsWith('/') ? resolvedName : `${baseDir}/${resolvedName}`)
  }

  return ''
}

export function getRpgItemImageUrl(
  icon?: string | null,
  definitionId?: number | null,
  useOrigin = false
): string {
  return getPixelAssetUrl('items', icon) ?? resolveRpgAssetUrl('/game/rpg/items', icon, useOrigin)
}

export function getRpgMonsterImageUrl(icon?: string | null, useOrigin = false): string {
  return getPixelAssetUrl('monsters', icon) ?? resolveRpgAssetUrl('/game/rpg/monsters', icon, useOrigin)
}

export function getRpgSkillImageUrl(icon?: string | null, useOrigin = false): string {
  return getPixelAssetUrl('skills', icon) ?? resolveRpgAssetUrl('/game/rpg/skills', icon, useOrigin)
}
