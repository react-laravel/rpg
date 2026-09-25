import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CombatLogList } from '../CombatLogList'
import { useGameStore } from '../../../stores/gameStore'
import type { CombatResult, GameCharacter, SkillWithLearnedState } from '../../../types'

afterEach(() => {
  useGameStore.setState(useGameStore.getInitialState())
})

describe('CombatLogList pet lines', () => {
  it('shows the familiar attack and the damage it took', () => {
    const log = {
      victory: false,
      monster: { name: '史莱姆', type: 'normal', level: 1, hp: 0, max_hp: 8 },
      damage_dealt: 8,
      damage_taken: 0,
      experience_gained: 1,
      copper_gained: 0,
      loot: {},
      character: { id: 1, name: '我' } as GameCharacter,
      combat_log_id: 9,
      pet_action: {
        name: '小兽',
        damage: 3,
        position: 0,
        monster_name: '史莱姆',
        damage_taken: 1,
      },
    } as CombatResult

    render(<CombatLogList logs={[log]} />)

    expect(screen.getByText('小兽 攻击 史莱姆 -3，受到 -1')).toBeInTheDocument()
  })

  it('shows only the last cast when a death log repeats every cast', () => {
    useGameStore.setState({
      skills: [
        {
          id: 5,
          name: '小火球',
          type: 'active',
          is_learned: true,
          max_level: 1,
          base_damage: 16,
          damage_per_level: 0,
          mana_cost: 8,
          mana_cost_per_level: 0,
          cooldown: 0,
        } as SkillWithLearnedState,
      ],
    })
    const casts = Array.from({ length: 6 }, () => ({
      skill_id: 5,
      name: '小火球',
      icon: null,
      effect_key: 'fireball',
      use_count: 1,
    }))
    const log = {
      victory: false,
      monster: { name: '巨角野猪', type: 'normal', level: 2, hp: 4, max_hp: 20 },
      damage_dealt: 40,
      damage_taken: 6,
      experience_gained: 0,
      copper_gained: 0,
      loot: {},
      skills_used: casts,
      character: { id: 1, name: '我' } as GameCharacter,
      combat_log_id: 12,
    } as CombatResult

    render(<CombatLogList logs={[log]} />)

    expect(screen.getAllByTitle('小火球')).toHaveLength(1)
    expect(screen.queryByText('×6')).not.toBeInTheDocument()
  })
})
