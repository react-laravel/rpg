import { describe, expect, it } from 'vitest'
import {
  combatLootValue,
  computeFarmRates,
  countRoundKills,
  createFarmSession,
  FARM_RATE_MIN_MS,
  formatEta,
  getFarmPowerKey,
  recordFarmGains,
  reconcileFarmSession,
  resumeFarmSession,
} from '../farmStats'

describe('farmStats', () => {
  it('resets the session when the map or combat power changes', () => {
    const session = createFarmSession(2, 'a', 1_000)
    const withGains = recordFarmGains(session, { exp: 100, lootValue: 40 }, 1_000)
    expect(reconcileFarmSession(withGains, 3, 'a', 2_000)?.exp).toBe(0)
    expect(reconcileFarmSession(withGains, 2, 'b', 2_000)?.exp).toBe(0)
    expect(reconcileFarmSession(withGains, 2, 'a', 2_000)?.exp).toBe(100)
  })

  it('reports per-minute rates after the minimum window', () => {
    const early = recordFarmGains(
      createFarmSession(1, 'p', 0),
      { exp: 1500, lootValue: 150, damage: 2400, taken: 300, kills: 6 },
      10_000
    )
    expect(computeFarmRates(early, FARM_RATE_MIN_MS - 1).expPerMin).toBeNull()
    const session = recordFarmGains(
      createFarmSession(1, 'p', 0),
      { exp: 1500, lootValue: 150, damage: 2400, taken: 300, kills: 6 },
      60_000
    )
    expect(computeFarmRates(session, 60_000)).toEqual({
      expPerMin: 1500,
      lootPerMin: 150,
      damagePerMin: 2400,
      takenPerMin: 300,
      killsPerMin: 6,
      elapsedMs: 60_000,
    })
  })

  it('does not add offline time after a page refresh resume', () => {
    const live = recordFarmGains(
      createFarmSession(1, 'p', 0),
      { exp: 600, lootValue: 60, damage: 900 },
      30_000
    )
    const resumed = resumeFarmSession(live, 3_600_000)
    const rates = computeFarmRates(resumed, 3_600_000)
    expect(rates.elapsedMs).toBe(30_000)
    expect(rates.expPerMin).toBe(1200)
    expect(rates.damagePerMin).toBe(1800)
  })

  it('keeps the sample when combat stats are not loaded yet', () => {
    const session = recordFarmGains(
      createFarmSession(2, 'full-key', 0),
      { exp: 80, lootValue: 10, damage: 40 },
      20_000
    )
    const kept = reconcileFarmSession(session, 2, 'placeholder', 25_000, false)
    expect(kept?.exp).toBe(80)
    expect(kept?.damage).toBe(40)
  })

  it('counts kills only for monsters that died this pulse', () => {
    expect(
      countRoundKills([
        { hp: 0, damage_taken: 12 },
        { hp: 8, damage_taken: 4 },
        { hp: 0, damage_taken: 0 },
      ])
    ).toBe(1)
  })

  it('formats time to next level', () => {
    expect(formatEta(3000, 1500)).toBe('2分钟')
    expect(formatEta(100, null)).toBeNull()
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
