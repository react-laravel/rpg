import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../../stores/gameStore'
import { CombatPanel } from '../CombatPanel'
import type { GameCharacter, CombatStats } from '../../../types'

vi.mock('../BattleArena', () => ({ BattleArena: () => <div>战场</div> }))
vi.mock('../CombatLogList', () => ({ CombatLogList: () => null }))
vi.mock('../BattleSkillBar', () => ({ BattleSkillBar: () => null }))
vi.mock('../CombatMapPicker', () => ({ CombatMapPicker: () => <button>地图</button> }))
vi.mock('../../../utils/soundManager', () => ({ soundManager: { play: vi.fn() } }))

beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState())
  useGameStore.setState({
    character: { id: 1, name: 'Hero', class: 'warrior' } as GameCharacter,
    currentMap: { id: 1, name: 'Camp', act: 1, monster_ids: [] },
    combatStats: { max_hp: 100, max_mana: 50 } as CombatStats,
    currentHp: 100,
  })
})

describe('death and revival', () => {
  it('shows the dialog again after a second death', async () => {
    render(<CombatPanel />)
    act(() => useGameStore.setState({ currentHp: 0 }))
    expect(await screen.findByRole('dialog', { name: '角色已阵亡' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '稍后再说' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    act(() => useGameStore.setState({ currentHp: 100 }))
    act(() => useGameStore.setState({ currentHp: 0 }))
    expect(await screen.findByRole('dialog', { name: '角色已阵亡' })).toBeInTheDocument()
  })

  it('keeps a failed revival open and closes only after success', async () => {
    const revive = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    useGameStore.setState({ currentHp: 0, revive })
    render(<CombatPanel />)
    await screen.findByRole('dialog')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '复活角色' })))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '复活角色' })))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(revive).toHaveBeenCalledTimes(2)
  })
})
