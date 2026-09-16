import { describe, expect, it } from 'vitest'
import { readBattleEffectAnchors } from '../effectAnchors'

function mountArena(targetSlots: number[]) {
  const arena = document.createElement('div')
  Object.defineProperty(arena, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }),
  })
  const caster = document.createElement('div')
  caster.setAttribute('data-effect-caster', '')
  Object.defineProperty(caster, 'getBoundingClientRect', {
    value: () => ({ left: 45, top: 80, width: 10, height: 10, right: 55, bottom: 90 }),
  })
  arena.append(caster)
  targetSlots.forEach((slot, index) => {
    const target = document.createElement('div')
    target.setAttribute('data-effect-target', String(slot))
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () => ({
        left: 10 + index * 30,
        top: 10,
        width: 10,
        height: 10,
        right: 20 + index * 30,
        bottom: 20,
      }),
    })
    arena.append(target)
  })
  document.body.append(arena)
  return arena
}

describe('readBattleEffectAnchors', () => {
  it('uses every monster as an AOE meteor target even if only one slot was reported', () => {
    const arena = mountArena([0, 2, 4])
    const anchors = readBattleEffectAnchors(arena, [2], true)
    expect(anchors.targets).toHaveLength(3)
  })

  it('keeps single-target skills on the reported slot', () => {
    const arena = mountArena([0, 2, 4])
    const anchors = readBattleEffectAnchors(arena, [2], false)
    expect(anchors.targets).toHaveLength(1)
    expect(anchors.targets[0].x).toBeCloseTo(0.45)
  })
})
