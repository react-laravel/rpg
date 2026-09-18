import { describe, expect, it } from 'vitest'
import { getRpgMonsterImageUrl, getRpgSkillImageUrl } from '../assetUrls'

describe('RPG asset URL resolution', () => {
  it('maps legacy monsters to pixel art and retains the skill path', () => {
    expect(getRpgMonsterImageUrl('wild-wolf.png')).toBe('/game/rpg/pixel-v1/monsters/pixel-monster-005.png')
    expect(getRpgSkillImageUrl('fireball.png')).toBe('/game/rpg/skills/fireball.png')
  })

  it('maps cached CDN monster urls to the same local pixel art', () => {
    expect(getRpgMonsterImageUrl('https://upyun.dogeow.com/game/rpg/monsters/bone-king.png')).toBe(
      '/game/rpg/pixel-v1/monsters/pixel-monster-014.png'
    )
  })
})
