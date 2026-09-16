import skillSoundManifestData from '../data/skill-sound-manifest.json'
import type { SkillUsedEntry } from '../types'

export interface SkillSoundManifestEntry {
  skillName: string
  effectKey?: string
  fileName: string
  preset: string
  durationSeconds: number
  promptEn: string
}

const SKILL_SOUND_BASE_PATH = '/game/rpg/sfx'

export const skillSoundManifest = skillSoundManifestData as SkillSoundManifestEntry[]

const skillSoundByName = new Map(skillSoundManifest.map(entry => [entry.skillName, entry]))

const skillSoundByEffectKey = new Map<string, SkillSoundManifestEntry>()
for (const entry of skillSoundManifest) {
  if (entry.effectKey && !skillSoundByEffectKey.has(entry.effectKey)) {
    skillSoundByEffectKey.set(entry.effectKey, entry)
  }
}

// Serve SFX from the Next app, not the image CDN. Upyun is missing several clips
// and Web Audio fetches also need CORS there.
const toSkillSoundUrl = (fileName: string) => `${SKILL_SOUND_BASE_PATH}/${fileName}`

export function getSkillSoundUrl(
  skill?: Pick<SkillUsedEntry, 'name' | 'effect_key'> | null
): string | null {
  if (!skill) return null

  const byName = skill.name ? skillSoundByName.get(skill.name) : undefined
  if (byName) {
    return toSkillSoundUrl(byName.fileName)
  }

  const byEffectKey = skill.effect_key ? skillSoundByEffectKey.get(skill.effect_key) : undefined
  if (byEffectKey) {
    return toSkillSoundUrl(byEffectKey.fileName)
  }

  return null
}

export function getSkillSoundDuration(
  skill?: Pick<SkillUsedEntry, 'name' | 'effect_key'> | null
): number | null {
  if (!skill) return null

  const byName = skill.name ? skillSoundByName.get(skill.name) : undefined
  if (byName) return byName.durationSeconds

  const byEffectKey = skill.effect_key ? skillSoundByEffectKey.get(skill.effect_key) : undefined
  if (byEffectKey) return byEffectKey.durationSeconds

  return null
}

export function getAllSkillSoundUrls(): string[] {
  return skillSoundManifest.map(entry => toSkillSoundUrl(entry.fileName))
}

/**
 * Place the clip so its impact (near the end) lands on the visual hit.
 * `lateMs` is decode/start delay after the visual clock began.
 */
export function skillSoundPlaybackWindow(
  clipDurationMs: number,
  hitAtMs?: number,
  lateMs = 0
): { delaySec: number; offsetSec: number } {
  const clip = Math.max(20, clipDurationMs)
  const late = Math.max(0, lateMs)
  if (hitAtMs == null || !Number.isFinite(hitAtMs)) {
    return { delaySec: 0, offsetSec: Math.min(late, clip - 20) / 1000 }
  }

  const impactAtInClip = clip * 0.88
  const startOnVisual = hitAtMs - impactAtInClip
  const delayMs = Math.max(0, startOnVisual - late)
  const offsetMs = Math.max(0, late - startOnVisual)
  return {
    delaySec: delayMs / 1000,
    offsetSec: Math.min(offsetMs, clip - 20) / 1000,
  }
}
