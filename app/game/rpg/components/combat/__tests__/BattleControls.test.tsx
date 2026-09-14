import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CharacterSkill } from '../../../types'
import { BattleSkillBar } from '../BattleSkillBar'
import { VSSwords } from '../VSSwords'

const fireball: CharacterSkill = {
  id: 11,
  character_id: 1,
  skill_id: 7,
  skill: {
    id: 7,
    name: '火球术',
    type: 'active',
    class_restriction: 'mage',
    max_level: 5,
    base_damage: 8,
    damage_per_level: 2,
    mana_cost: 3,
    mana_cost_per_level: 1,
    cooldown: 2,
    effect_key: 'fireball',
  },
  level: 2,
  slot_index: 0,
}

describe('BattleSkillBar', () => {
  it('shows icon-only enabled state, cooldown, and toggles the skill', () => {
    const onSkillToggle = vi.fn()
    render(
      <BattleSkillBar
        activeSkills={[fireball]}
        skillsUsed={[]}
        skillCooldowns={{ 7: 2 }}
        enabledSkillIds={[7]}
        onSkillToggle={onSkillToggle}
      />
    )

    const button = screen.getByRole('button', { name: '火球术，已启用，冷却 2' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('4 MP')).not.toBeInTheDocument()
    expect(screen.queryByText('火球术')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(button.querySelector('[data-enabled="true"]')).toBeTruthy()

    fireEvent.click(button)
    expect(onSkillToggle).toHaveBeenCalledWith(7)
  })

  it('renders a newly used skill with the triggered animation class', () => {
    render(
      <BattleSkillBar
        activeSkills={[fireball]}
        skillsUsed={[{ skill_id: 7, name: '火球术', round: 3 }]}
        skillCooldowns={{}}
        enabledSkillIds={[7]}
        onSkillToggle={() => undefined}
      />
    )

    expect(screen.getByRole('button', { name: '火球术，已启用' }).className).toContain(
      'skill-triggered'
    )
  })

  it('does not draw an accent icon border when the skill is disabled', () => {
    render(
      <BattleSkillBar
        activeSkills={[fireball]}
        skillsUsed={[]}
        skillCooldowns={{}}
        enabledSkillIds={[]}
        onSkillToggle={() => undefined}
      />
    )

    const button = screen.getByRole('button', { name: '火球术，已关闭' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button.querySelector('[data-enabled="false"]')).toBeTruthy()
  })
})

describe('VSSwords', () => {
  it.each([
    { isFighting: false, isLoading: false, isDead: false, label: '开始战斗' },
    { isFighting: true, isLoading: false, isDead: false, label: '停止战斗' },
    { isFighting: false, isLoading: false, isDead: true, label: '复活' },
  ])('shows $label state', ({ isFighting, isLoading, isDead, label }) => {
    const onToggle = vi.fn()
    render(
      <VSSwords
        isFighting={isFighting}
        isLoading={isLoading}
        isDead={isDead}
        onToggle={onToggle}
        variant="inline"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
