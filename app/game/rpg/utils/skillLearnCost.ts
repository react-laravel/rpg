import type { SkillWithLearnedState } from '../types'

const COPPER_PER_LEVEL = 80

/** 与接口 SkillLearnCost 相同：80 × 解锁等级 × 原技能点权重。 */
export function skillLearnCopperCost(skill: Pick<SkillWithLearnedState, 'unlock_level' | 'skill_points_cost' | 'learn_copper_cost'>): number {
  if (typeof skill.learn_copper_cost === 'number') return skill.learn_copper_cost
  const level = Math.max(1, skill.unlock_level ?? 1)
  const weight = Math.max(1, skill.skill_points_cost ?? 1)
  return COPPER_PER_LEVEL * level * weight
}
