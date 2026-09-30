import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '@/lib/api'
import { useGameStore } from '../gameStore'
import { createItem } from '../../components/inventory/__tests__/testUtils'

vi.mock('@/lib/api', () => ({
  apiGet: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

const gem = createItem({
  id: 2,
  quantity: 3,
  slot_index: 4,
  definition: { id: 2, name: 'Ruby', type: 'gem', base_stats: {}, required_level: 1 },
})
const item = createItem({ id: 1, sockets: 2, slot_index: 2 })
const updated = createItem({
  ...item,
  gems: [{ id: 10, socket_index: 0, gemDefinition: gem.definition }],
})

beforeEach(() => {
  vi.resetAllMocks()
  useGameStore.setState({
    selectedCharacterId: 1,
    inventory: [item, gem],
    equipment: {},
    character: null,
    currentMap: null,
    farmSession: null,
    combatStats: null,
    statsBreakdown: null,
    isLoading: false,
    error: null,
  })
})

describe('socketGem', () => {
  it('keeps the authoritative remaining stack in its backpack slot', async () => {
    const remaining = { ...gem, quantity: 2 }
    vi.mocked(post).mockResolvedValueOnce({ equipment: updated, gem_item: remaining })

    expect(await useGameStore.getState().socketGem(item.id, gem.id, 0)).toEqual(updated)

    expect(post).toHaveBeenCalledWith('/rpg/gems/socket', {
      item_id: item.id, gem_item_id: gem.id, socket_index: 0, character_id: 1,
    })
    expect(useGameStore.getState().inventory).toEqual([updated, remaining])
    expect(useGameStore.getState().isLoading).toBe(false)
  })

  it.each([null, undefined])('removes a consumed gem (server remainder: %s)', async remaining => {
    vi.mocked(post).mockResolvedValueOnce({ equipment: updated, gem_item: remaining })

    await useGameStore.getState().socketGem(item.id, gem.id, 0)

    expect(useGameStore.getState().inventory).toEqual([updated])
  })

  it('updates equipped items without adding them to the backpack', async () => {
    const remaining = { ...gem, quantity: 2 }
    useGameStore.setState({ inventory: [gem], equipment: { weapon: item } })
    vi.mocked(post).mockResolvedValueOnce({ equipment: updated, gem_item: remaining })

    await useGameStore.getState().socketGem(item.id, gem.id, 0)

    expect(useGameStore.getState().equipment.weapon).toEqual(updated)
    expect(useGameStore.getState().inventory).toEqual([remaining])
  })

  it('preserves inventory on failure and permits a successful retry', async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error('Socket is occupied'))
    expect(await useGameStore.getState().socketGem(item.id, gem.id, 0)).toBeNull()
    expect(useGameStore.getState().inventory).toEqual([item, gem])
    expect(useGameStore.getState().error).toBe('Socket is occupied')
    expect(useGameStore.getState().isLoading).toBe(false)

    vi.mocked(post).mockResolvedValueOnce({ equipment: updated, gem_item: { ...gem, quantity: 2 } })
    await useGameStore.getState().socketGem(item.id, gem.id, 0)
    expect(useGameStore.getState().error).toBeNull()
    expect(useGameStore.getState().inventory[1].quantity).toBe(2)
  })
})
