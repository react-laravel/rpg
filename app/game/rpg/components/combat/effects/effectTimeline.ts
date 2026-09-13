import type { EffectProfile } from './effectRegistry'

export type EffectPhase = 'cast' | 'travel' | 'impact' | 'tail' | 'complete'

export function getEffectTiming(profile: EffectProfile, duration?: number, reducedMotion = false) {
  if (reducedMotion) return { castMs: 60, hitMs: 90, durationMs: 280 }
  const durationMs = Number.isFinite(duration) ? Math.max(300, Math.min(2400, duration!)) : profile.durationMs
  const hitMs = profile.hitMs * durationMs / profile.durationMs
  return { castMs: Math.min(180, hitMs * 0.45), hitMs, durationMs }
}

export type EffectTiming = ReturnType<typeof getEffectTiming>

/** Time can skip frames or resume after suspension; hit and completion still occur once, in order. */
export function createEffectTimeline(timing: EffectTiming, onHit: () => void, onComplete: () => void) {
  let hit = false
  let complete = false
  let cancelled = false
  return {
    advance(elapsed: number): EffectPhase {
      if (cancelled || complete) return 'complete'
      if (elapsed >= timing.hitMs && !hit) { hit = true; onHit() }
      if (cancelled) return 'complete'
      if (elapsed >= timing.durationMs) { complete = true; onComplete(); return 'complete' }
      if (elapsed < timing.castMs) return 'cast'
      if (elapsed < timing.hitMs) return 'travel'
      return elapsed < timing.hitMs + 160 ? 'impact' : 'tail'
    },
    cancel() { cancelled = true },
  }
}
