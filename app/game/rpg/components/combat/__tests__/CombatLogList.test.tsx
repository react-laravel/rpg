import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CombatLogList } from '../CombatLogList'
import type { CombatResult, GameCharacter } from '../../../types'

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
})
