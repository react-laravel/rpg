import { describe, expect, it } from 'vitest'
import { getPixelAssetUrl } from '../pixelAssets'
import { getRpgItemImageUrl } from '../assetUrls'
import { getMapBackgroundUrls } from '../mapBackground'

describe('pixel catalogue compatibility', () => {
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
