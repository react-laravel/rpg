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

it('protects bounded resource/name rectangles with padding without masking the actor', () => {
  const arena = mountArena([0])
  for (let i = 0; i < 20; i++) {
    const label = document.createElement('div')
    label.setAttribute(i % 2 ? 'data-monster-name' : 'data-combat-resources', '')
    label.getBoundingClientRect = () => ({ x: -1, y: 3, left: -1, top: 3, width: 20, height: 8, right: 19, bottom: 11, toJSON: () => ({}) })
    arena.append(label)
  }
  const anchors = readBattleEffectAnchors(arena, [0], false)
  expect(anchors.exclusions).toHaveLength(14)
  expect(anchors.exclusions?.[0]).toMatchObject({ x: 0, y: 0.01, width: 0.21 })
  expect(anchors.exclusions?.[0].height).toBeCloseTo(0.12)
  expect(anchors.targets).toEqual([{ x: 0.15, y: 0.15 }])
})

it('anchors the summon to the actual pet next to the caster', () => {
  const arena = mountArena([0])
  const pet = document.createElement('div')
  pet.dataset.combatUnitImage = 'pet'
  pet.getBoundingClientRect = () => ({ x: 25, y: 80, left: 25, top: 80, width: 10, height: 10, right: 35, bottom: 90, toJSON: () => ({}) })
  arena.append(pet)
  const anchors = readBattleEffectAnchors(arena, [0], false)
  expect(anchors.companion).toEqual({ x: 0.3, y: 0.85 })
  expect(anchors.source).toEqual({ x: 0.5, y: 0.85 })
})
