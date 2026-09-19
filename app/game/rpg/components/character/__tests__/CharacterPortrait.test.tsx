import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GameItem } from '../../../types'
import { CharacterPortrait } from '../CharacterPortrait'
import { getCharacterAppearance } from '../../../utils/characterAppearance'
import manifest from '../../../data/character-appearance-manifest.json'

function item(type: 'armor' | 'weapon', icon: string, name = icon): GameItem {
  return { definition: { type, icon, name } } as GameItem
}

describe('character appearance', () => {
  it('resolves every elemental robe for both genders from legacy asset keys', () => {
    const sets = { apprentice: 'earth', moonlight: 'wood', starlight: 'water', arcane: 'fire', sky: 'metal', forbidden: 'wind', eternal: 'thunder' }
    for (const [legacy, element] of Object.entries(sets)) {
      for (const gender of ['male', 'female']) {
        expect(getCharacterAppearance(gender, item('armor', `mage-set-${legacy}-armor.png`)).src)
          .toBe(`/game/rpg/pixel-v1/characters/${gender}-${element}.png`)
      }
    }
    expect(getCharacterAppearance('female', item('armor', 'https://upyun.dogeow.com/game/rpg/items/item_53.png?v=2')).outfit).toBe('cloth')
    expect(getCharacterAppearance('male', item('armor', '/game/rpg/pixel-v1/items/wood-armor.png')).outfit).toBe('wood')
  })

  it('uses clothed base appearances for empty or unknown armour without inventing a set', () => {
    expect(getCharacterAppearance('female').src).toContain('/female-base.png')
    expect(getCharacterAppearance(undefined).src).toContain('/male-base.png')
    expect(getCharacterAppearance('male', item('armor', 'custom.png')).outfit).toBe('base')
    expect(getCharacterAppearance('female', item('weapon', 'wood-armor.png')).outfit).toBe('base')
  })

  it('changes clothes, held weapon and gender immediately with the equipped props', () => {
    const wood = item('armor', 'mage-set-moonlight-armor.png', '青藤法袍')
    const fire = item('armor', 'mage-set-arcane-armor.png', '烈阳法袍')
    const crystal = item('weapon', 'crystal-staff.png', '水晶法杖')
    const thunder = item('weapon', 'mage-set-eternal-weapon.png', '雷霆法杖')
    const view = render(<CharacterPortrait gender="female" armor={wood} weapon={crystal} />)
    expect(view.getByRole('img', { name: '女法师，青藤法袍，手持水晶法杖' })).toHaveAttribute('data-outfit', 'wood')
    expect(view.container.querySelector('[data-character-body]')).toHaveAttribute('src', expect.stringContaining('female-wood-held.png'))
    expect(view.container.querySelector('[data-character-fingers]')).toHaveAttribute('src', expect.stringContaining('female-wood-fingers.png'))
    expect(view.container.querySelector('[data-character-weapon]')).toHaveAttribute('src', expect.stringContaining('/game/rpg/pixel-v1/items/crystal-staff.png'))
    view.rerender(<CharacterPortrait gender="male" armor={fire} weapon={thunder} />)
    expect(view.getByRole('img', { name: '男法师，烈阳法袍，手持雷霆法杖' })).toHaveAttribute('data-outfit', 'fire')
    expect(view.container.querySelector('[data-character-weapon]')).toHaveAttribute('src', expect.stringContaining('/game/rpg/pixel-v1/items/thunder-weapon.png'))
    view.rerender(<CharacterPortrait gender="male" />)
    expect(view.getByRole('img', { name: '男法师，基础便装，空手' })).toHaveAttribute('data-outfit', 'base')
    expect(view.container.querySelector('[data-character-body]')).toHaveAttribute('src', expect.stringContaining('male-base.png'))
    expect(view.container.querySelector('[data-character-weapon]')).toBeNull()
    expect(view.container.querySelector('[data-character-fingers]')).toBeNull()
  })

  it('recovers from failed images when a different outfit or weapon is equipped', () => {
    const view = render(<CharacterPortrait gender="male" armor={item('armor', 'wood-armor.png')} weapon={item('weapon', 'crystal-staff.png')} />)
    fireEvent.error(view.container.querySelector('[data-character-body]')!)
    expect(view.container.querySelector('[data-character-body]')).toHaveAttribute('src', expect.stringContaining('/game/rpg/pixel-v1/characters/male-base-held.png'))
    fireEvent.error(view.container.querySelector('[data-character-weapon]')!)
    expect(view.container.querySelector('[data-character-weapon]')).toBeNull()
    view.rerender(<CharacterPortrait gender="female" armor={item('armor', 'water-armor.png')} weapon={item('weapon', 'fire-weapon.png')} />)
    expect(view.container.querySelector('[data-character-body]')).toHaveAttribute('src', expect.stringContaining('/game/rpg/pixel-v1/characters/female-water-held.png'))
    expect(view.container.querySelector('[data-character-weapon]')).toHaveAttribute('src', expect.stringContaining('/game/rpg/pixel-v1/items/fire-weapon.png'))
  })

  it('tilts every staff outward using its own shaft direction, including diagonal legacy icons', () => {
    for (const pose of Object.values(manifest.weapons)) {
      expect(pose.sourceAngle + pose.angle).toBeCloseTo(-28)
    }
    expect(manifest.weapons['/game/rpg/pixel-v1/items/moon-staff.png'].angle).toBeLessThan(-50)
  })
})
