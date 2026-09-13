/**
 * Character level / EXP progression.
 * Mirrors rpg-api `config/game.php`:
 * - per-level cost = multiplier * currentLevel^2
 * - stored thresholds are cumulative totals to reach that level
 */
export const EXPERIENCE_FALLBACK_MULTIPLIER = 50

/** Soft cap for earnable / displayable character levels (inclusive). */
export const MAX_CHARACTER_LEVEL = 200

/** Cumulative EXP required to reach `level` (level 1 => 0). */
export function cumulativeExperienceForLevel(
  level: number,
  multiplier: number = EXPERIENCE_FALLBACK_MULTIPLIER
): number {
  if (level <= 1) return 0
  let total = 0
  for (let current = 1; current < level; current++) {
    total += multiplier * current * current
  }
  return total
}

/** Build a full cumulative EXP table for levels 1..maxLevel. */
export function buildExperienceTable(
  maxLevel: number = MAX_CHARACTER_LEVEL,
  multiplier: number = EXPERIENCE_FALLBACK_MULTIPLIER
): Record<number, number> {
  const table: Record<number, number> = {}
  for (let level = 1; level <= maxLevel; level++) {
    table[level] = cumulativeExperienceForLevel(level, multiplier)
  }
  return table
}

/**
 * Prefer API-provided thresholds, then fill any missing levels through `maxLevel`
 * with the standard curve so UI/progress never stalls when the API table is short.
 */
export function mergeExperienceTable(
  apiTable: Record<number | string, number> | null | undefined,
  maxLevel: number = MAX_CHARACTER_LEVEL
): Record<number, number> {
  const merged = buildExperienceTable(maxLevel)
  if (!apiTable) return merged

  for (const [key, value] of Object.entries(apiTable)) {
    const level = Number(key)
    const threshold = Number(value)
    if (!Number.isFinite(level) || level < 1 || !Number.isFinite(threshold)) continue
    merged[level] = threshold
  }

  for (let level = 1; level <= maxLevel; level++) {
    if (merged[level] == null) {
      merged[level] = cumulativeExperienceForLevel(level)
    }
  }

  return merged
}
