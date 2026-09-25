// Combat types for RPG game
import type { GameItem } from './item'
import type { GameCharacter } from './character'

export type MonsterType = 'normal' | 'elite' | 'boss'
export type SkillType = 'active' | 'passive'
export type SkillTargetType = 'single' | 'all'

/** 战斗中怪物信息 */
export interface CombatMonster {
  id: number
  /** 怪物实例唯一ID，用于前端检测新怪物 */
  instance_id?: string
  icon?: string
  name: string
  type: MonsterType
  level: number
  hp: number
  max_hp: number
  attack?: number
  defense?: number
  experience?: number
  /** 怪物在战斗阵列中的位置 (0-4) */
  position?: number
  /** 本场是否被攻击 */
  was_attacked?: boolean
  /** 宝宝这一拍实际打掉的生命，已计入 damage_taken */
  pet_damage?: number
  /** 宝宝这一拍的攻击数值，目标已死时仍会显示 */
  pet_swing?: number
}

/** 宝宝这一拍的攻击和挨打 */
export interface PetAction {
  name: string
  damage: number
  position: number | null
  monster_name: string | null
  damage_taken: number
}

/** 单场战斗中释放的技能（含次数） */
export interface SkillUsedEntry {
  skill_id: number
  name: string
  icon?: string | null
  /** 前端技能特效标识，由后端配置 */
  effect_key?: string | null
  target_type?: 'single' | 'all'
  passive_effects?: Record<string, unknown>
  passive_names?: string[]
  use_count?: number
  round?: number
}

/** 角色护盾在本场战斗推进后的状态 */
export interface CombatShield {
  hp: number
  max_hp: number
  ticks: number
  broke: boolean
  absorbed: number
}

export interface CombatResult {
  victory: boolean
  defeat?: boolean
  auto_stopped?: boolean
  monster_id?: number
  /** 多怪物数组 */
  monsters?: CombatMonster[]
  monster: {
    name: string
    type: MonsterType
    level: number
    hp?: number
    max_hp?: number
  }
  /** 本场开始时的怪物血量，用于先渲染再播扣血动画 */
  monster_hp_before_round?: number
  damage_dealt: number
  damage_taken: number
  /** 本回合玩家攻击是否暴击 */
  is_crit?: boolean
  /** 兼容旧推送；新服务端恒为 0，冷却已改为剩余次数 */
  rounds?: number
  experience_gained: number
  copper_gained: number
  loot: {
    copper?: number
    item?: GameItem
    item_lost?: boolean
    item_lost_reason?: string
  }
  skills_used?: SkillUsedEntry[]
  skill_target_positions?: number[] // 技能命中的怪物位置 (0-4)
  /** 技能冷却剩余次数 */
  skill_cooldowns?: Record<number, number>
  /** 战斗推进后自动恢复记录 */
  round_regen?: Record<string, { name: string; restored: number }> | null
  /** 魔法护盾等角色护盾 */
  shield?: CombatShield | null
  /** 宝宝这一拍的攻击和受到的伤害 */
  pet_action?: PetAction | null
  character: GameCharacter
  /** 仅当本场战斗结束（胜利/失败）时存在 */
  combat_log_id?: number
}

export interface CombatLog {
  id: number
  character_id: number
  map_id: number
  monster_id: number
  monster:
    | {
        id?: number
        name?: string
        type?: MonsterType
        level?: number
      }
    | string
    | null
  map:
    | {
        id?: number
        name?: string
      }
    | string
    | null
  damage_dealt: number
  damage_taken: number
  victory: boolean
  loot_dropped: Record<string, unknown> | null
  loot?: {
    copper?: number
    item?: GameItem
    item_lost?: boolean
    item_lost_reason?: string
  }
  experience_gained: number
  copper_gained: number
  duration_seconds: number
  skills_used?: SkillUsedEntry[]
  /** 战斗推进后自动恢复记录 */
  round_regen?: Record<string, { name: string; restored: number }> | null
  /** 宝宝这一拍的攻击和受到的伤害 */
  pet_action?: PetAction | null
  created_at: string
}

/** 战斗日志详情 */
export interface CombatLogDetail {
  id: number
  map: {
    id: number
    name: string
  }
  monster: {
    id: number
    name: string
  }
  victory: boolean
  damage_dealt: number
  damage_taken: number
  experience_gained: number
  copper_gained: number
  duration_seconds: number
  skills_used: SkillUsedEntry[]
  loot_dropped: Record<string, unknown> | null
  round_regen?: Record<string, { name: string; restored: number }> | null
  pet_action?: PetAction | null
  created_at: string
  character: {
    level: number
    attack: number
    defense: number
    crit_rate: number
    crit_damage: number
  }
  monster_stats: {
    level: number
    hp: number
    max_hp: number
    attack: number
    defense: number
    experience: number
    copper: number
  }
  damage_detail: {
    base_attack: number
    skill_damage: number
    crit_damage: number
    aoe_damage: number
    total: number
    defense_reduction: number
    defense_reduction_percent?: number
    counter_damage: number
  }
  battle: {
    alive_count: number
    killed_count: number
    is_crit?: boolean
  }
  difficulty: {
    tier: number
    multiplier: number
  }
}
