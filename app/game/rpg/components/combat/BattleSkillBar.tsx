'use client'

import type { CharacterSkill, SkillUsedEntry } from '../../types'
import { SkillIcon } from '../shared/SkillIcon'
import styles from '../../rpg.module.css'
import interfaceStyles from '../../interface.module.css'

export type SkillBarLayout = 'row' | 'wrap'

/** 战斗技能栏：图标启停与冷却，点击切换参与自动战斗 */
export function BattleSkillBar({
  activeSkills,
  skillsUsed,
  skillCooldowns,
  enabledSkillIds,
  onSkillToggle,
  disabled,
  layout = 'row',
}: {
  activeSkills: CharacterSkill[]
  skillsUsed: SkillUsedEntry[] | undefined
  skillCooldowns: Record<number, number>
  enabledSkillIds: number[]
  onSkillToggle: (skillId: number) => void
  disabled?: boolean
  layout?: SkillBarLayout
}) {
  if (activeSkills.length === 0) return null
  const usedSkillIds = new Set(skillsUsed?.map(skill => skill.skill_id) ?? [])

  return (
    <div
      className={
        layout === 'row'
          ? 'flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain px-0.5 py-1'
          : 'flex flex-wrap items-center gap-2 px-0.5 py-1'
      }
    >
      {activeSkills.map(cs => {
        const def = cs.skill
        const remainingCooldown = skillCooldowns[def.id] ?? 0
        const onCooldown = remainingCooldown > 0
        const enabled = enabledSkillIds.includes(def.id)
        const wasUsed = usedSkillIds.has(def.id)
        const manaCost = def.mana_cost + (cs.level - 1) * (def.mana_cost_per_level ?? 0)
        const costLabel = manaCost > 0 ? ` | 消耗 ${manaCost} MP` : ''
        const btnClass = [
          interfaceStyles.skillCard,
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          wasUsed ? styles['skill-triggered'] : '',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')

        return (
          <button
            key={cs.id}
            type="button"
            disabled={disabled}
            className={btnClass}
            aria-pressed={enabled}
            aria-label={`${def.name}，${enabled ? '已启用' : '已关闭'}${onCooldown ? `，冷却 ${remainingCooldown}` : ''}`}
            title={
              enabled
                ? `${def.name} 已启用（再点关闭）${costLabel}`
                : `${def.name} 点击启用${costLabel}`
            }
            onClick={() => onSkillToggle(def.id)}
          >
            <span
              data-enabled={enabled ? 'true' : 'false'}
              className={[
                'relative inline-flex rounded-lg',
                enabled ? 'border border-[var(--rpg-accent)]' : 'border border-transparent',
                onCooldown ? styles['skill-on-cooldown'] : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <SkillIcon icon={def.icon} effectKey={def.effect_key} name={def.name} />
              {onCooldown && (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  aria-hidden
                >
                  {remainingCooldown}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
