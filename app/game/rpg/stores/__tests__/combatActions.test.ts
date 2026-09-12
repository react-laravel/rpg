import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post, apiGet } from '@/lib/api'
import { useGameStore } from '../gameStore'
import type { GameCharacter, MapDefinition } from '../../types'

vi.mock('@/lib/api', () => ({
  apiGet: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  apiRequest: vi.fn(),
}))
vi.mock('../../utils/soundManager', () => ({ soundManager: { play: vi.fn() } }))

const map: MapDefinition = { id: 1, name: 'Camp', act: 1, monster_ids: [] }
const character = { id: 1, current_hp: 100, current_mana: 20 } as GameCharacter
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  useGameStore.setState(useGameStore.getInitialState())
  useGameStore.setState({
    selectedCharacterId: 1,
    character,
    currentHp: 100,
    currentMap: map,
    maps: [map],
    enabledSkillIds: [7],
  })
})

describe('travel actions', () => {
  it('serializes travel despite an unrelated loading flag change', async () => {
    const pending = deferred<unknown>()
    vi.mocked(post).mockReturnValueOnce(pending.promise)
    const first = useGameStore.getState().enterMap(2)
    useGameStore.setState({ isLoading: false })
    expect(useGameStore.getState().pendingMapId).toBe(2)
    expect(await useGameStore.getState().enterMap(3)).toBe(false)
    expect(await useGameStore.getState().teleportToMap(3)).toBe(false)
    expect(post).toHaveBeenCalledTimes(1)
    pending.resolve({ map: { ...map, id: 2 }, character })
    expect(await first).toBe(true)
    expect(useGameStore.getState().pendingMapId).toBeNull()
    expect(useGameStore.getState().currentMap?.id).toBe(2)
  })

  it('retains the previous map on failure and supports retry', async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error('传送失败'))
    expect(await useGameStore.getState().enterMap(2)).toBe(false)
    expect(useGameStore.getState()).toMatchObject({
      currentMap: map,
      error: '传送失败',
      pendingMapId: null,
    })
    vi.mocked(post).mockResolvedValueOnce({ map: { ...map, id: 2 }, character })
    expect(await useGameStore.getState().enterMap(2)).toBe(true)
    expect(useGameStore.getState().error).toBeNull()
  })

  it('ignores travel results belonging to a previous character', async () => {
    const pending = deferred<unknown>()
    vi.mocked(post).mockReturnValueOnce(pending.promise)
    const request = useGameStore.getState().enterMap(2)
    useGameStore.setState({ selectedCharacterId: 9, character: { ...character, id: 9 } })
    pending.resolve({ map: { ...map, id: 2 }, character })
    expect(await request).toBe(false)
    expect(useGameStore.getState().character?.id).toBe(9)
    expect(useGameStore.getState().currentMap?.id).toBe(1)
  })

  it('does not auto-start when travel returns a dead character', async () => {
    vi.mocked(post).mockResolvedValueOnce({ map, character: { ...character, current_hp: 0 } })
    await useGameStore.getState().enterMap(1)
    expect(useGameStore.getState()).toMatchObject({ currentHp: 0, shouldAutoCombat: false })
  })
})

describe('combat actions', () => {
  it('keeps the confirmed fighting state and skills when stopping fails', async () => {
    useGameStore.setState({ isFighting: true, shouldAutoCombat: true })
    vi.mocked(post).mockRejectedValueOnce(new Error('停止失败'))
    await useGameStore.getState().stopCombat()
    expect(useGameStore.getState()).toMatchObject({
      isFighting: true,
      shouldAutoCombat: false,
      combatAction: null,
      enabledSkillIds: [7],
      error: '停止失败',
    })
    vi.mocked(post).mockResolvedValueOnce({})
    await useGameStore.getState().stopCombat()
    expect(useGameStore.getState()).toMatchObject({
      isFighting: false,
      enabledSkillIds: [7],
      error: null,
    })
  })

  it('prevents competing start, stop and revive operations', async () => {
    const pending = deferred<unknown>()
    vi.mocked(post).mockReturnValueOnce(pending.promise)
    const start = useGameStore.getState().startCombat()
    await useGameStore.getState().startCombat()
    await useGameStore.getState().stopCombat()
    expect(await useGameStore.getState().revive()).toBe(false)
    expect(post).toHaveBeenCalledTimes(1)
    pending.resolve({})
    await start
    expect(useGameStore.getState().combatAction).toBeNull()
  })

  it('resets auto-combat intent after a failed start so clicking start can retry', async () => {
    useGameStore.setState({ shouldAutoCombat: true })
    vi.mocked(post).mockRejectedValueOnce(new Error('开始失败'))
    await useGameStore.getState().startCombat()
    expect(useGameStore.getState()).toMatchObject({
      isFighting: false,
      shouldAutoCombat: false,
      combatAction: null,
    })
  })

  it('returns failure for an unsuccessful revive and releases its lock', async () => {
    useGameStore.setState({ currentHp: 0 })
    vi.mocked(post).mockRejectedValueOnce(new Error('复活失败'))
    expect(await useGameStore.getState().revive()).toBe(false)
    expect(useGameStore.getState()).toMatchObject({
      currentHp: 0,
      combatAction: null,
      shouldAutoCombat: false,
      error: '复活失败',
    })
    vi.mocked(post).mockResolvedValueOnce({ character })
    vi.mocked(apiGet).mockResolvedValue({ character, current_hp: 100, current_mana: 20 })
    expect(await useGameStore.getState().revive()).toBe(true)
    expect(useGameStore.getState()).toMatchObject({ currentHp: 100, shouldAutoCombat: false })
  })
})
