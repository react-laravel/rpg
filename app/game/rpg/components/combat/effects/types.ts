import type { SkillEffectType } from './effectRegistry'
export type { SkillEffectType } from './effectRegistry'

/** Coordinates relative to the rendered battlefield, in CSS pixels normalized to 0–1. */
export interface EffectPoint { x: number; y: number }
export interface EffectAnchors { source: EffectPoint; targets: EffectPoint[] }

export interface EffectBaseProps {
  active: boolean
  duration?: number
  sourcePosition?: EffectPoint
  targetPosition?: EffectPoint
  targetPositions?: EffectPoint[]
  /** Read actual actor centers when a cast starts or the battlefield resizes. */
  resolveAnchors?: () => EffectAnchors
  /** A stable seed for repeatable particles and trails. */
  seed?: number
  onComplete?: () => void
  onHit?: () => void
  /** Fired once when the effect clock starts, so SFX can share that timeline. */
  onStart?: () => void
}

export interface SkillEffectProps extends EffectBaseProps {
  type: SkillEffectType
  className?: string
}
