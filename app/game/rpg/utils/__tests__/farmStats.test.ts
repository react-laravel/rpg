import { describe, expect, it } from 'vitest'
import {
  combatLootValue,
  computeFarmRates,
  createFarmSession,
  FARM_RATE_MIN_MS,
  getFarmPowerKey,
  recordFarmGains,
  reconcileFarmSession,
} from '../farmStats'

describe('farmStats', () => {
  it('resets the session when the map or combat power changes', () => {
    const session = createFarmSession(2, 'a', 1_000)
    const withGains = recordFarmGains(session, 100, 40)
    expect(reconcileFarmSession(withGains, 3, 'a', 2_000)?.exp).toBe(0)
    expect(reconcileFarmSession(withGains, 2, 'b', 2_000)?.exp).toBe(0)
    expect(reconcileFarmSession(withGains, 2, 'a', 2_000)?.exp).toBe(100)
  })

  it('reports per-minute rates after the minimum window', () => {
    const session = recordFarmGains(createFarmSession(1, 'p', 0), 1500, 150)
    expect(computeFarmRates(session, FARM_RATE_MIN_MS - 1).expPerMin).toBeNull()
    expect(computeFarmRates(session, 60_000)).toEqual({
      expPerMin: 1500,
      lootPerMin: 150,
      elapsedMs: 60_000,
    })
  })

  it('counts copper plus item sell price as drop value', () => {
    expect(combatLootValue(20, 80)).toBe(100)
    expect(combatLootValue(20, null)).toBe(20)
  })

  it('changes power key after equipment or attributes change', () => {
    const character = {
      id: 1,
      level: 10,
      strength: 3,
      dexterity: 4,
      vitality: 3,
      energy: 5,
    }
    const before = getFarmPowerKey(character, { attack: 12, defense: 8 }, { weapon: null })
    const afterEquip = getFarmPowerKey(character, { attack: 20, defense: 8 }, {
      weapon: { id: 9 } as never,
    })
    const afterStats = getFarmPowerKey(
      { ...character, strength: 8 },
      { attack: 17, defense: 8 },
      { weapon: null }
    )
    expect(before).not.toBe(afterEquip)
    expect(before).not.toBe(afterStats)
  })
})
