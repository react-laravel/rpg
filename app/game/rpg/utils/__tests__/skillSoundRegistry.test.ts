import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { getAllSkillSoundUrls, getSkillSoundUrl, skillSoundManifest } from '../skillSoundRegistry'

describe('skillSoundRegistry', () => {
  it('returns a specific sound for a known skill name', () => {
    expect(getSkillSoundUrl({ name: '小火球', effect_key: 'fireball' })).toBe(
      '/game/rpg/sfx/fireball-ember.mp3'
    )
  })

  it('resolves frost-nova by effect key', () => {
    expect(getSkillSoundUrl({ name: '冰霜新星', effect_key: 'frost-nova' })).toBe(
      '/game/rpg/sfx/frost-nova-ring.mp3'
    )
  })

  it('resolves arcane missile and cataclysm sounds', () => {
    expect(getSkillSoundUrl({ name: '奥术飞弹', effect_key: 'arcane-missile' })).toBe(
      '/game/rpg/sfx/multishot-volley.mp3'
    )
    expect(getSkillSoundUrl({ name: '元素灾变', effect_key: 'element-cataclysm' })).toBe(
      '/game/rpg/sfx/thunder-wrath-burst.mp3'
    )
  })

  it('falls back to effect_key when the skill name is unknown', () => {
    expect(getSkillSoundUrl({ name: '未知技能', effect_key: 'meteor' })).toBe(
      '/game/rpg/sfx/meteor-impact-fall.mp3'
    )
  })

  it('returns null for an unmapped skill', () => {
    expect(getSkillSoundUrl({ name: '未知技能', effect_key: 'unknown-effect' })).toBeNull()
  })

  it('returns preloaded urls for every manifest entry', () => {
    expect(getAllSkillSoundUrls()).toHaveLength(skillSoundManifest.length)
    expect(getAllSkillSoundUrls()[0]).toMatch(/^\/game\/rpg\/sfx\//)
  })

  it('points every manifest entry at an existing public audio file', () => {
    for (const url of getAllSkillSoundUrls()) {
      expect(existsSync(join(process.cwd(), 'public', url))).toBe(true)
    }
  })
})
