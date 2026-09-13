import { MAX_CHARACTER_LEVEL } from '../config/progression'

export type LevelProgress = {
  earned: number
  required: number
  percent: number
}

/** The API supplies cumulative experience thresholds, not per-level costs. */
export function getLevelProgress(
  level: number,
  experience: number,
  table: Record<number, number>
): LevelProgress | null {
  if (level >= MAX_CHARACTER_LEVEL) return null
  const currentThreshold = table[level] ?? 0
  const nextThreshold = table[level + 1]
  if (nextThreshold == null || nextThreshold <= currentThreshold) return null
  const required = nextThreshold - currentThreshold
  const earned = Math.max(0, Math.min(required, experience - currentThreshold))
  return { earned, required, percent: (earned / required) * 100 }
}

/** Cumulative EXP threshold for the next level, or null at/above the soft cap. */
export function getNextLevelThreshold(
  level: number,
  table: Record<number, number>
): number | null {
  if (level >= MAX_CHARACTER_LEVEL) return null
  const next = table[level + 1]
  return next == null ? null : next
}
