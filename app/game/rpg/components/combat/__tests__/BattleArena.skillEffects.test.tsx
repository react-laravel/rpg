import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SkillEffectProps } from '../effects/types'
import { BattleArena } from '../BattleArena'

const effects = vi.hoisted(() => ({ latest: null as SkillEffectProps | null }))
vi.mock('../effects', () => ({
  SkillEffect: (props: SkillEffectProps) => {
    effects.latest = props
    return <canvas data-testid="skill-canvas" data-seed={props.seed} />
  },
}))
vi.mock('../MonsterIcon', () => ({ MonsterIcon: () => <span>Monster</span> }))
vi.mock('../MonsterGroup', () => ({ MonsterGroup: () => null }))
vi.mock('../../../utils/soundManager', () => ({
  soundManager: { play: vi.fn(), playSkill: vi.fn() },
}))

const props = {
  character: { name: '法师', level: 1 },
  combatStats: { max_hp: 100, max_mana: 100 },
  currentHp: 90,
  currentMana: 80,
  damageTaken: 10,
  monster: { name: '史莱姆', type: 'normal', level: 1, hp: 20, max_hp: 50 },
  monsterHpBeforeRound: 50,
  isFighting: true,
  isLoading: false,
  skillUsed: { skill_id: 1, name: '小火球', effect_key: 'fireball' },
  roundNumber: 1,
  combatLogId: 1,
}

beforeEach(() => {
  vi.useFakeTimers()
  effects.latest = null
})
afterEach(() => vi.useRealTimers())

describe('battle spell settlement', () => {
  it('holds HP until impact and keeps the effect mounted while its tail fades', async () => {
    const onRoundVisualSettled = vi.fn()
    render(<BattleArena {...props} onRoundVisualSettled={onRoundVisualSettled} />)
    await act(async () => {})
    expect(screen.getByText('50/50')).toBeInTheDocument()
    expect(screen.getByText('100/100')).toBeInTheDocument()

    await act(async () => effects.latest?.onHit?.())
    expect(screen.getByText('20/50')).toBeInTheDocument()
    expect(screen.getByText('90/100')).toBeInTheDocument()
    expect(screen.getByTestId('skill-canvas')).toBeInTheDocument()
    expect(onRoundVisualSettled).toHaveBeenCalledOnce()

    await act(async () => effects.latest?.onComplete?.())
    expect(screen.queryByTestId('skill-canvas')).not.toBeInTheDocument()
    expect(onRoundVisualSettled).toHaveBeenCalledOnce()
  })

  it('restarts repeated skills and ignores callbacks retained from an interrupted round', async () => {
    const onRoundVisualSettled = vi.fn()
    const view = render(<BattleArena {...props} onRoundVisualSettled={onRoundVisualSettled} />)
    await act(async () => {})
    const interrupted = effects.latest!

    view.rerender(<BattleArena {...props} roundNumber={2} onRoundVisualSettled={onRoundVisualSettled} />)
    await act(async () => {})
    expect(effects.latest?.seed).not.toBe(interrupted.seed)
    await act(async () => {
      interrupted.onHit?.()
      interrupted.onComplete?.()
    })
    expect(onRoundVisualSettled).not.toHaveBeenCalled()
    expect(screen.getByText('50/50')).toBeInTheDocument()
    expect(screen.getByTestId('skill-canvas')).toBeInTheDocument()

    await act(async () => effects.latest?.onHit?.())
    expect(onRoundVisualSettled).toHaveBeenCalledOnce()
    expect(screen.getByText('20/50')).toBeInTheDocument()
  })

  it('clearing the round removes the canvas and invalidates old settlement callbacks', async () => {
    const onRoundVisualSettled = vi.fn()
    const view = render(<BattleArena {...props} onRoundVisualSettled={onRoundVisualSettled} />)
    await act(async () => {})
    const interrupted = effects.latest!
    view.rerender(<BattleArena {...props} isFighting={false} skillUsed={null} roundNumber={undefined} combatLogId={null} damageTaken={undefined} onRoundVisualSettled={onRoundVisualSettled} />)
    await act(async () => {
      interrupted.onHit?.()
      interrupted.onComplete?.()
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByTestId('skill-canvas')).not.toBeInTheDocument()
    expect(onRoundVisualSettled).not.toHaveBeenCalled()
  })
  it('renders the current familiar-summoning skill and settles it on the shared hit timeline', async () => {
    const onRoundVisualSettled = vi.fn()
    render(<BattleArena {...props} skillUsed={{ skill_id: 10, name: '诱惑之光', effect_key: 'charm-light' }} onRoundVisualSettled={onRoundVisualSettled} />)
    await act(async () => {})
    expect(effects.latest?.type).toBe('charm-light')
    expect(onRoundVisualSettled).not.toHaveBeenCalled()
    await act(async () => effects.latest?.onHit?.())
    expect(onRoundVisualSettled).toHaveBeenCalledOnce()
    expect(screen.getByTestId('skill-canvas')).toBeInTheDocument()
  })

})
