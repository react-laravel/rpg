import { describe, expect, it } from 'vitest'
import { getPixelAssetUrl } from '../pixelAssets'
import { getRpgItemImageUrl, getRpgSkillImageUrl } from '../assetUrls'
import catalogue from '@/output/pixel-rpg/skill-catalogue.json'
import { getMapBackgroundUrls } from '../mapBackground'

describe('pixel catalogue compatibility', () => {
  it('covers all current mage skill lines and their 37 tree nodes', () => {
    expect(catalogue.icons).toHaveLength(10)
    expect(catalogue.icons.flatMap(icon => icon.nodes)).toHaveLength(37)
    for (const icon of catalogue.icons) {
      expect(getRpgSkillImageUrl(`${icon.key}.png`)).toBe(`/game/rpg/pixel-v1/skills/${icon.key}.png`)
    }
  })

  it('resolves cached skill CDN and origin links', () => {
    expect(getRpgSkillImageUrl('https://upyun.dogeow.com/game/rpg/skills/fireball_origin.png?v=1', true)).toBe('/game/rpg/pixel-v1/skills/fireball.png')
    expect(getRpgSkillImageUrl('custom-spell.png')).toBe('/game/rpg/skills/custom-spell.png')
  })

  it('resolves old map names, cached CDN origins and the new resource key', () => {
    const expected = '/game/rpg/pixel-v1/maps/pixel-map-01.png'
    for (const source of ['safe-training-camp.jpg', 'pixel-map-01.jpg', 'map_1.jpg', 'https://upyun.dogeow.com/game/rpg/bg/safe-training-camp_origin.jpg?v=2']) {
      expect(getPixelAssetUrl('maps', source)).toBe(expected)
      expect(getMapBackgroundUrls({ background: source } as never, true)).toEqual([expected])
    }
  })

  it('uses the original mage set key with the new elemental artwork', () => {
    expect(getRpgItemImageUrl('mage-set-apprentice-weapon.png', 1001, true)).toBe('/game/rpg/pixel-v1/items/earth-weapon.png')
    expect(getRpgItemImageUrl('mage-set-eternal-armor.png', 1051)).toBe('/game/rpg/pixel-v1/items/thunder-armor.png')
  })

  it('keeps unknown assets on their normal path', () => {
    expect(getPixelAssetUrl('items', 'custom-item.png')).toBeNull()
    expect(getRpgItemImageUrl('https://example.com/custom-item.png')).toBe('https://example.com/custom-item.png')
  })
})
