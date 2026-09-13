import { describe, expect, it } from 'vitest'
import { buildExperienceTable } from '../../config/progression'
import { getLevelProgress, getNextLevelThreshold } from '../experience'

describe('level experience progress', () => {
  const table = { 2: 50, 3: 250 }
  it('subtracts the current level cumulative threshold', () => {
    expect(getLevelProgress(2, 150, table)).toEqual({ earned: 100, required: 200, percent: 50 })
  })
  it('resets at a new level and clamps out-of-range experience', () => {
    expect(getLevelProgress(2, 50, table)?.percent).toBe(0)
    expect(getLevelProgress(2, -10, table)?.percent).toBe(0)
    expect(getLevelProgress(2, 400, table)?.percent).toBe(100)
  })
  it('does not invent a threshold while data is unavailable', () => {
    expect(getLevelProgress(2, 150, {})).toBeNull()
    expect(getLevelProgress(2, 150, { 2: 100, 3: 50 })).toBeNull()
  })
  it('supports levels past the historical API table end (100)', () => {
    const full = buildExperienceTable()
    const progress = getLevelProgress(105, 19200000, full)
    expect(progress).not.toBeNull()
    expect(progress!.required).toBe(full[106] - full[105])
    expect(getNextLevelThreshold(105, full)).toBe(full[106])
  })
  it('returns null at the soft level cap', () => {
    const full = buildExperienceTable()
    expect(getLevelProgress(200, full[200], full)).toBeNull()
    expect(getNextLevelThreshold(200, full)).toBeNull()
  })
})
