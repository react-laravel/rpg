/** The API supplies cumulative experience thresholds, not per-level costs. */
export function getLevelProgress(level: number, experience: number, table: Record<number, number>) {
  const currentThreshold = table[level] ?? 0
  const nextThreshold = table[level + 1]
  if (nextThreshold == null || nextThreshold <= currentThreshold) return null
  const required = nextThreshold - currentThreshold
  const earned = Math.max(0, Math.min(required, experience - currentThreshold))
  return { earned, required, percent: (earned / required) * 100 }
}
