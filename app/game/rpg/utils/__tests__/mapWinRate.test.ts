import { describe, expect, it } from 'vitest'
import {
  estimateMapWinRate,
  playerFromLoadout,
  simulatePack,
  winRateTone,
  type MapWinRatePlayer,
} from '../mapWinRate'
import type { MonsterDefinition } from '../../types'

function player(overrides: Partial<MapWinRatePlayer> = {}): MapWinRatePlayer {
  return {
    hp: 80,
    maxHp: 80,
    mana: 40,
    maxMana: 40,
    attack: 20,
    defense: 10,
    vitality: 5,
    energy: 5,
    critRate: 0.06,
    critDamage: 1.5,
    skills: [{ power: 160, manaCost: 8, cooldown: 0, aoe: false }],
    ...overrides,
  }
}

function monster(overrides: Partial<MonsterDefinition> = {}): MonsterDefinition {
  return {
    id: 1,
    name: '测试',
    type: 'normal',
    level: 1,
    hp_base: 12,
    hp_per_level: 0,
    attack_base: 4,
    attack_per_level: 0,
    defense_base: 1,
    defense_per_level: 0,
    experience_base: 4,
    experience_per_level: 0,
    drop_table: {},
    ...overrides,
  }
}

describe('mapWinRate', () => {
  it('lets a strong character clear a small pack', () => {
    expect(
      simulatePack(player(), [
        { hp: 12, attack: 2, defense: 1 },
        { hp: 12, attack: 2, defense: 1 },
      ])
    ).toBe(true)
  })

  it('fails a weak character against five elites', () => {
    const weak = player({ hp: 12, maxHp: 12, attack: 3, defense: 1, skills: [] })
    expect(
      simulatePack(weak, Array.from({ length: 5 }, () => ({ hp: 40, attack: 12, defense: 4 })))
    ).toBe(false)
  })

  it('rates a starter map higher than a brutal elite map', () => {
    const loadout = playerFromLoadout(
      {
        id: 1,
        user_id: 1,
        name: '测',
        level: 1,
        experience: 0,
        copper: 0,
        strength: 3,
        dexterity: 4,
        vitality: 5,
        energy: 5,
        skill_points: 0,
        stat_points: 0,
        current_map_id: 1,
        is_fighting: false,
        last_combat_at: null,
        current_hp: 25,
        current_mana: 30,
        created_at: '',
        updated_at: '',
      },
      { max_hp: 25, max_mana: 30, attack: 8, defense: 4, crit_rate: 0.05, crit_damage: 1.5 },
      [
        {
          id: 2,
          name: '小火球',
          type: 'active',
          max_level: 1,
          base_damage: 160,
          damage_per_level: 0,
          mana_cost: 8,
          mana_cost_per_level: 0,
          cooldown: 0,
          target_type: 'single',
          is_learned: true,
        },
      ],
      [2]
    )
    expect(loadout).not.toBeNull()
    const easy = estimateMapWinRate(
      { monsters: [monster(), monster({ id: 2, name: '兔', hp_base: 8, attack_base: 2 })] },
      loadout!
    )
    const hard = estimateMapWinRate(
      {
        monsters: [
          monster({ id: 3, type: 'elite', hp_base: 90, attack_base: 28, defense_base: 10 }),
          monster({ id: 4, type: 'boss', hp_base: 140, attack_base: 32, defense_base: 12 }),
        ],
      },
      loadout!
    )
    expect(easy?.percent ?? 0).toBeGreaterThan(hard?.percent ?? 0)
    expect(winRateTone(20)).toBe('bad')
    expect(winRateTone(90)).toBe('good')
  })
})
