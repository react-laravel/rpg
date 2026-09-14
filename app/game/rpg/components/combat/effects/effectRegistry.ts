import type { SkillUsedEntry } from '../../../types'

export type EffectFamily =
  | 'fire' | 'ice' | 'lightning' | 'meteor' | 'frost' | 'void' | 'arcane'
  | 'slash' | 'charge' | 'whirlwind' | 'slam' | 'arrow' | 'wind' | 'shadow'
  | 'trap' | 'mark' | 'heal' | 'shield' | 'aura' | 'cataclysm'

export interface EffectProfile {
  family: EffectFamily
  color: string
  highlight: string
  hitMs: number
  durationMs: number
  target: 'enemy' | 'self'
}

const effect = (
  family: EffectFamily, color: string, highlight: string,
  hitMs: number, durationMs: number, target: EffectProfile['target'] = 'enemy'
): EffectProfile => ({ family, color, highlight, hitMs, durationMs, target })

/** Active keys from the current skill trees, plus effects used by existing characters. */
export const EFFECT_PROFILES = {
  fireball: effect('fire', '#ff6b25', '#ffe5a3', 520, 1100),
  'ice-arrow': effect('ice', '#49c9ff', '#e4fbff', 440, 1000),
  'frost-nova': effect('frost', '#5ad5f5', '#e5feff', 430, 1160),
  lightning: effect('lightning', '#61a9ff', '#fff1b1', 280, 850),
  'chain-lightning': effect('lightning', '#8699ff', '#e0f4ff', 530, 1180),
  'thunder-wrath': effect('lightning', '#be92ff', '#fff1bd', 510, 1280),
  meteor: effect('meteor', '#ff7835', '#fff0b8', 680, 1400),
  'meteor-storm': effect('meteor', '#ff542a', '#ffde9f', 730, 1500),
  'ice-age': effect('frost', '#60c7ff', '#eefcff', 650, 1450),
  blackhole: effect('void', '#9873ff', '#f4d9ff', 650, 1450),
  'arcane-missile': effect('arcane', '#b27aff', '#f4dbff', 580, 1120),
  'element-cataclysm': effect('cataclysm', '#ad91ff', '#fff4db', 760, 1550),
  slash: effect('slash', '#f5b34b', '#fff5cc', 330, 850),
  'shield-bash': effect('slam', '#80c5fa', '#e7f7ff', 380, 900),
  charge: effect('charge', '#ffa640', '#fff0b3', 450, 1030),
  whirlwind: effect('whirlwind', '#f6b462', '#fff4d6', 510, 1200),
  'battle-roar': effect('aura', '#ffc568', '#fff2c9', 330, 1000, 'self'),
  'iron-wall': effect('shield', '#96b6d0', '#effaff', 340, 1060, 'self'),
  execute: effect('slash', '#ff4c67', '#ffe5df', 460, 1060),
  rage: effect('aura', '#ff526c', '#ffc5ac', 400, 1160, 'self'),
  'titan-fall': effect('slam', '#eead5d', '#fff5c5', 660, 1400),
  pierce: effect('arrow', '#e2be75', '#fff6d2', 400, 870),
  'multi-shot': effect('arrow', '#f3ce8a', '#fff5d6', 520, 1060),
  poison: effect('arrow', '#82da64', '#e5ffae', 470, 1130),
  'gale-step': effect('wind', '#62e5c7', '#e1fff5', 300, 850, 'self'),
  'shadow-step': effect('shadow', '#bc78f0', '#f5ddff', 430, 1060),
  dodge: effect('wind', '#a5ecd4', '#edfff4', 230, 750, 'self'),
  'trap-net': effect('trap', '#a0de9b', '#e8ffc5', 440, 1150),
  'hunters-mark': effect('mark', '#ffd476', '#fff6d6', 360, 1070),
  'arrow-rain': effect('arrow', '#efc384', '#fff2d0', 670, 1380),
  heal: effect('heal', '#59dba8', '#e3ffbc', 360, 1120, 'self'),
  shield: effect('shield', '#76aaff', '#d7edff', 350, 1130, 'self'),
} satisfies Record<string, EffectProfile>

export type SkillEffectType = keyof typeof EFFECT_PROFILES

const LEGACY_KEYS: Record<string, SkillEffectType> = { buff: 'battle-roar', dash: 'gale-step' }
const LEGACY_NAMES: Record<string, SkillEffectType> = {
  小火球: 'fireball', 火球术: 'fireball', 冰霜新星: 'frost-nova', 雷霆万钧: 'thunder-wrath', 烈焰风暴: 'meteor-storm',
}

export function resolveSkillEffect(skill?: Pick<SkillUsedEntry, 'name' | 'effect_key'> | null): SkillEffectType | null {
  if (!skill) return null
  // Older characters can share an effect key while retaining a distinct named skill.
  if (LEGACY_NAMES[skill.name]) return LEGACY_NAMES[skill.name]
  const key = skill.effect_key
  if (!key) return null
  if (Object.hasOwn(EFFECT_PROFILES, key)) return key as SkillEffectType
  return LEGACY_KEYS[key] ?? null
}
