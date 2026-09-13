import { describe, expect, it } from 'vitest'
import {
  MAX_CHARACTER_LEVEL,
  buildExperienceTable,
  cumulativeExperienceForLevel,
  mergeExperienceTable,
} from '../progression'

describe('progression config', () => {
  it('uses a soft cap of 200', () => {
    expect(MAX_CHARACTER_LEVEL).toBe(200)
  })

  it('matches the known rpg-api cumulative thresholds through level 100', () => {
    expect(cumulativeExperienceForLevel(1)).toBe(0)
    expect(cumulativeExperienceForLevel(2)).toBe(50)
    expect(cumulativeExperienceForLevel(3)).toBe(250)
    expect(cumulativeExperienceForLevel(100)).toBe(16417500)
  })

  it('builds a continuous table through the soft cap', () => {
    const table = buildExperienceTable()
    expect(table[1]).toBe(0)
    expect(table[105]).toBe(19019000)
    expect(table[200]).toBe(cumulativeExperienceForLevel(200))
    expect(Object.keys(table)).toHaveLength(MAX_CHARACTER_LEVEL)
  })

  it('fills gaps when the API table stops early', () => {
    const merged = mergeExperienceTable({ 1: 0, 2: 50, 100: 16417500 })
    expect(merged[100]).toBe(16417500)
    expect(merged[101]).toBe(cumulativeExperienceForLevel(101))
    expect(merged[200]).toBe(cumulativeExperienceForLevel(200))
  })

  it('prefers API values when present', () => {
    const merged = mergeExperienceTable({ 1: 0, 2: 99 })
    expect(merged[2]).toBe(99)
    expect(merged[3]).toBe(cumulativeExperienceForLevel(3))
  })
})
