import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canSocketItem, getGemsInInventory, useGemManagement } from '../useGemManagement'
import { createItem } from './testUtils'
import type { GameItem } from '../../../types'

describe('useGemManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters gem items from inventory', () => {
    const items = [
      createItem({
        id: 1,
        definition: { id: 1, name: 'Sword', type: 'weapon', base_stats: {}, required_level: 1 },
      }),
      createItem({
        id: 2,
        definition: { id: 2, name: 'Ruby', type: 'gem', base_stats: {}, required_level: 1 },
      }),
      createItem({
        id: 3,
        definition: { id: 3, name: 'Armor', type: 'armor', base_stats: {}, required_level: 1 },
      }),
      createItem({
        id: 4,
        definition: { id: 4, name: 'Sapphire', type: 'gem', base_stats: {}, required_level: 1 },
      }),
    ]

    expect(getGemsInInventory(items).map(item => item.id)).toEqual([2, 4])
  })

  it('allows socketing only when the item has free sockets', () => {
    expect(canSocketItem(createItem({ sockets: 0 }))).toBe(false)
    expect(
      canSocketItem(
        createItem({
          sockets: 2,
          gems: [
            {
              id: 1,
              socket_index: 0,
              gemDefinition: {
                id: 9,
                name: 'Ruby',
                type: 'gem',
                base_stats: {},
                required_level: 1,
              },
            },
          ],
        })
      )
    ).toBe(true)
    expect(
      canSocketItem(
        createItem({
          sockets: 1,
          gems: [
            {
              id: 2,
              socket_index: 0,
              gemDefinition: {
                id: 10,
                name: 'Topaz',
                type: 'gem',
                base_stats: {},
                required_level: 1,
              },
            },
          ],
        })
      )
    ).toBe(false)
  })

  it('opens and closes the gem selector around a selected item', () => {
    const item = createItem({ id: 11 })
    const { result } = renderHook(() =>
      useGemManagement({
        inventory: [],
        socketGem: vi.fn(async () => undefined),
        unsocketGem: vi.fn(async () => undefined),
      })
    )

    expect(result.current.showGemSelector).toBe(false)
    expect(result.current.selectedSocketItem).toBeNull()

    act(() => {
      result.current.openGemSelector(item)
    })

    expect(result.current.showGemSelector).toBe(true)
    expect(result.current.selectedSocketItem).toBe(item)

    act(() => {
      result.current.closeGemSelector()
    })

    expect(result.current.showGemSelector).toBe(false)
    expect(result.current.selectedSocketItem).toBeNull()
  })

  it('does not socket when no item is selected', async () => {
    const socketGem = vi.fn(async () => undefined)
    const gem = createItem({
      id: 21,
      definition: { id: 21, name: 'Ruby', type: 'gem', base_stats: {}, required_level: 1 },
    })

    const { result } = renderHook(() =>
      useGemManagement({
        inventory: [gem],
        socketGem,
        unsocketGem: vi.fn(async () => undefined),
      })
    )

    await act(async () => {
      await result.current.handleSocketGem(gem, 0)
    })

    expect(socketGem).not.toHaveBeenCalled()
    expect(result.current.showGemSelector).toBe(false)
  })

  it('sockets a selected gem and clears selector state when nothing remains', async () => {
    const filled = createItem({
      id: 31,
      sockets: 1,
      gems: [
        {
          id: 1,
          socket_index: 0,
          gemDefinition: { id: 32, name: 'Ruby', type: 'gem', base_stats: {}, required_level: 1 },
        },
      ],
    })
    const socketGem = vi.fn(async () => filled)
    const onSocketComplete = vi.fn()
    const item = createItem({ id: 31, sockets: 1 })
    const gem = createItem({
      id: 32,
      definition: { id: 32, name: 'Ruby', type: 'gem', base_stats: {}, required_level: 1 },
    })

    const { result } = renderHook(() =>
      useGemManagement({
        inventory: [gem],
        onSocketComplete,
        socketGem,
        unsocketGem: vi.fn(async () => undefined),
      })
    )

    act(() => {
      result.current.openGemSelector(item)
    })

    await act(async () => {
      await result.current.handleSocketGem(gem, 0)
    })

    expect(socketGem).toHaveBeenCalledWith(item.id, gem.id, 0)
    expect(onSocketComplete).toHaveBeenCalledTimes(1)
    expect(result.current.showGemSelector).toBe(false)
    expect(result.current.selectedSocketItem).toBeNull()
  })

  it('keeps the selector open so the next gems can be socketed without reopening', async () => {
    const gemDefinition = {
      id: 32,
      name: 'Ruby',
      type: 'gem' as const,
      base_stats: {},
      required_level: 1,
    }
    const afterFirst = createItem({
      id: 31,
      sockets: 3,
      gems: [{ id: 1, socket_index: 0, gemDefinition }],
    })
    const socketGem = vi.fn(async () => afterFirst)
    const onSocketComplete = vi.fn()
    const item = createItem({ id: 31, sockets: 3 })
    const firstGem = createItem({ id: 32, definition: gemDefinition })
    const secondGem = createItem({
      id: 33,
      definition: { ...gemDefinition, id: 33, name: 'Sapphire' },
    })

    const { result } = renderHook(() =>
      useGemManagement({
        inventory: [firstGem, secondGem],
        onSocketComplete,
        socketGem,
        unsocketGem: vi.fn(async () => undefined),
      })
    )

    act(() => {
      result.current.openGemSelector(item)
    })

    await act(async () => {
      await result.current.handleSocketGem(firstGem, 0)
    })

    expect(socketGem).toHaveBeenCalledWith(item.id, firstGem.id, 0)
    expect(onSocketComplete).not.toHaveBeenCalled()
    expect(result.current.showGemSelector).toBe(true)
    expect(result.current.selectedSocketItem).toBe(afterFirst)
  })

  it('keeps socketing when the only gem stack still has units left', async () => {
    const gem = createItem({
      id: 32,
      quantity: 2,
      definition: { id: 32, name: 'Ruby', type: 'gem', base_stats: {}, required_level: 1 },
    })
    const item = createItem({ id: 31, sockets: 2 })
    const updated = createItem({
      ...item,
      gems: [{ id: 1, socket_index: 0, gemDefinition: gem.definition }],
    })
    const onSocketComplete = vi.fn()
    const { result } = renderHook(() =>
      useGemManagement({
        inventory: [gem],
        socketGem: vi.fn(async () => updated),
        unsocketGem: vi.fn(async () => undefined),
        onSocketComplete,
      })
    )

    act(() => result.current.openGemSelector(item))
    await act(async () => result.current.handleSocketGem(gem, 0))

    expect(result.current.showGemSelector).toBe(true)
    expect(result.current.selectedSocketItem).toBe(updated)
    expect(onSocketComplete).not.toHaveBeenCalled()
  })

  it.each([false, true])('ignores an old socket response after dismissal (reopen: %s)', async reopen => {
    const gem = createItem({ id: 32 })
    const item = createItem({ id: 31, sockets: 1 })
    const nextItem = createItem({ id: 41, sockets: 2 })
    let finish!: (value: GameItem) => void
    const socketGem = vi.fn(() => new Promise<GameItem>(resolve => { finish = resolve }))
    const onSocketComplete = vi.fn()
    const { result } = renderHook(() =>
      useGemManagement({
        inventory: [gem],
        socketGem,
        unsocketGem: vi.fn(async () => undefined),
        onSocketComplete,
      })
    )

    act(() => result.current.openGemSelector(item))
    let pending!: Promise<void>
    act(() => { pending = result.current.handleSocketGem(gem, 0) })
    act(() => {
      result.current.closeGemSelector()
      if (reopen) result.current.openGemSelector(nextItem)
    })
    await act(async () => { finish(item); await pending })

    expect(result.current.showGemSelector).toBe(reopen)
    expect(result.current.selectedSocketItem).toBe(reopen ? nextItem : null)
    expect(result.current.isSocketing).toBe(false)
    expect(onSocketComplete).not.toHaveBeenCalled()
  })

  it('prevents repeated clicks and permits retry after a failed request', async () => {
    const gem = createItem({ id: 32 })
    const item = createItem({ id: 31, sockets: 1 })
    let finish!: (value: GameItem | null) => void
    const socketGem = vi.fn(() => new Promise<GameItem | null>(resolve => { finish = resolve }))
    const { result } = renderHook(() =>
      useGemManagement({ inventory: [gem], socketGem, unsocketGem: vi.fn(async () => undefined) })
    )

    act(() => result.current.openGemSelector(item))
    let pending!: Promise<void>
    act(() => {
      pending = result.current.handleSocketGem(gem, 0)
      void result.current.handleSocketGem(gem, 0)
    })
    expect(socketGem).toHaveBeenCalledTimes(1)
    expect(result.current.isSocketing).toBe(true)
    await act(async () => { finish(null); await pending })
    expect(result.current.showGemSelector).toBe(true)
    expect(result.current.selectedSocketItem).toBe(item)
    expect(result.current.isSocketing).toBe(false)

    socketGem.mockResolvedValueOnce(item)
    await act(async () => result.current.handleSocketGem(gem, 0))
    expect(socketGem).toHaveBeenCalledTimes(2)
  })

  it('unsockets a gem and triggers completion callback', async () => {
    const unsocketGem = vi.fn(async () => undefined)
    const onUnsocketComplete = vi.fn()
    const item = createItem({ id: 41 })

    const { result } = renderHook(() =>
      useGemManagement({
        inventory: [],
        onUnsocketComplete,
        socketGem: vi.fn(async () => undefined),
        unsocketGem,
      })
    )

    await act(async () => {
      await result.current.handleUnsocketGem(item, 2)
    })

    expect(unsocketGem).toHaveBeenCalledWith(item.id, 2)
    expect(onUnsocketComplete).toHaveBeenCalledTimes(1)
  })

  it('ignores unsocket requests without an item', async () => {
    const unsocketGem = vi.fn(async () => undefined)

    const { result } = renderHook(() =>
      useGemManagement({
        inventory: [],
        socketGem: vi.fn(async () => undefined),
        unsocketGem,
      })
    )

    await act(async () => {
      await result.current.handleUnsocketGem(null, 0)
    })

    expect(unsocketGem).not.toHaveBeenCalled()
  })
})
