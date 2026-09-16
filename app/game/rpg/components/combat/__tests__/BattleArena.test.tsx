import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BattleArena } from '../BattleArena'

vi.mock('../effects', () => ({ SkillEffect: () => null }))
vi.mock('../MonsterGroup', () => ({ MonsterGroup: () => null }))
vi.mock('../../../utils/soundManager', () => ({
  soundManager: { play: vi.fn(), playSkill: vi.fn() },
}))

const baseProps = {
  character: { name: 'Hero', level: 1 },
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

  it('shows HP regen in red and MP regen in blue', async () => {
    render(
      <BattleArena
        {...baseProps}
        currentHp={40}
        currentMana={20}
        damageTaken={10}
        roundRegen={{
          hp: { name: '生命恢复', restored: 22 },
          mp: { name: '法力恢复', restored: 10 },
        }}
      />
    )
    await act(async () => {})
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    const hpRegen = screen.getByText('+22')
    const mpRegen = screen.getByText('+10')
    expect(hpRegen).toHaveAttribute('data-floating', 'hp-regen')
    expect(mpRegen).toHaveAttribute('data-floating', 'mp-regen')
    expect(hpRegen.className).toMatch(/regen-hp/)
    expect(mpRegen.className).toMatch(/regen-mp/)
    expect(hpRegen.className).not.toMatch(/text-white/)
    expect(mpRegen.className).not.toMatch(/text-white/)
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

  it('shows a shield bubble on the character avatar', async () => {
    render(
      <BattleArena
        {...baseProps}
        isFighting
        currentHp={80}
        damageTaken={undefined}
        combatLogId={null}
        shield={{ hp: 60, max_hp: 100, ticks: 5, broke: false, absorbed: 0 }}
      />
    )
    await act(async () => {})
    expect(screen.getByTestId('character-shield-hp')).toHaveTextContent('60')
    expect(document.querySelector('[data-shield="active"]')).not.toBeNull()
  })

  it('plays a break visual when the shield shatters', async () => {
    render(
      <BattleArena
        {...baseProps}
        isFighting
        currentHp={80}
        combatLogId={4}
        shield={{ hp: 0, max_hp: 100, ticks: 0, broke: true, absorbed: 40 }}
      />
    )
    await act(async () => {})
    expect(document.querySelector('[data-shield="break"]')).not.toBeNull()
  })

  it('searches for enemies while fighting without monsters instead of showing paused', async () => {
    render(
      <BattleArena
        {...baseProps}
        isFighting
        currentHp={100}
        damageTaken={undefined}
        combatLogId={null}
      />
    )
    await act(async () => {})
    expect(screen.getByText('正在寻找敌人')).toBeInTheDocument()
    expect(screen.queryByText('战斗已暂停')).not.toBeInTheDocument()
    expect(screen.queryByText('战斗中')).not.toBeInTheDocument()
  })
})
