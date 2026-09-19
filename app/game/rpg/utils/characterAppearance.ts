import type { GameItem } from '../types'
import { getPixelAssetUrl } from './pixelAssets'

export type CharacterGender = 'male' | 'female'
export type CharacterOutfit = 'base' | 'cloth' | 'earth' | 'wood' | 'water' | 'fire' | 'metal' | 'wind' | 'thunder'

const armorOutfits: Record<string, CharacterOutfit> = {
  'cloth-robe-armor.png': 'cloth',
  'earth-armor.png': 'earth',
  'wood-armor.png': 'wood',
  'water-armor.png': 'water',
  'fire-armor.png': 'fire',
  'metal-armor.png': 'metal',
  'wind-armor.png': 'wind',
  'thunder-armor.png': 'thunder',
}

export function getCharacterAppearance(gender?: string, armor?: GameItem | null) {
  const characterGender: CharacterGender = gender === 'female' ? 'female' : 'male'
  const armorUrl = armor?.definition?.type === 'armor'
    ? getPixelAssetUrl('items', armor.definition.icon)
    : null
  const outfit = armorOutfits[armorUrl?.split('/').pop() ?? ''] ?? 'base'
  const base = `/game/rpg/pixel-v1/characters/${characterGender}`

  return {
    gender: characterGender,
    outfit,
    src: `${base}-${outfit}.png`,
    heldSrc: `${base}-${outfit}-held.png`,
    fallbackSrc: `${base}-base.png`,
    heldFallbackSrc: `${base}-base-held.png`,
    avatarSrc: `${base}-avatar.png`,
  }
}
