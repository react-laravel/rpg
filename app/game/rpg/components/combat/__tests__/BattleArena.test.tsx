import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BattleArena } from '../BattleArena'

vi.mock('../effects', () => ({ SkillEffect: () => null }))
vi.mock('../MonsterGroup', () => ({ MonsterGroup: () => null }))
vi.mock('../../../utils/soundManager', () => ({
  soundManager: { play: vi.fn(), playSkill: vi.fn() },
}))

const baseProps = {
  character: { name: 'Hero', class: 'warrior', level: 1 },
  combatStats: { max_hp: 1000, max_mana: 100 },
  currentHp: 0,
  currentMana: 10,
  monster: null,
  isFighting: false,
  isLoading: false,
  combatLogId: 1,
  damageTaken: 1000,
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('battle resource display', () => {
  it('shows revived HP and mana immediately after the old round is cleared', async () => {
    const view = render(<BattleArena {...baseProps} />)
    await act(async () => {})
    expect(screen.getByText('0/1000')).toBeInTheDocument()
    view.rerender(
      <BattleArena
        {...baseProps}
        combatLogId={null}
        damageTaken={undefined}
        currentHp={1000}
        currentMana={100}
      />
    )
    expect(screen.getByText('1000/1000')).toBeInTheDocument()
    expect(screen.getByText('100/100')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('1000/1000')).toBeInTheDocument()
  })

  it('cancels delayed regeneration from the previous round', async () => {
    const view = render(
      <BattleArena
        {...baseProps}
        currentHp={40}
        damageTaken={100}
        roundRegen={{
          hp: { name: '生命恢复', restored: 10 },
          mp: { name: '法力恢复', restored: 5 },
        }}
      />
    )
    await act(async () => {})
    view.rerender(<BattleArena {...baseProps} combatLogId={2} currentHp={20} damageTaken={20} />)
    await act(async () => {})
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('20/1000')).toBeInTheDocument()
    expect(screen.queryByText('40/1000')).not.toBeInTheDocument()
  })
})
