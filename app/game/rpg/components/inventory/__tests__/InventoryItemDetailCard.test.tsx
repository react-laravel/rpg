import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InventoryItemDetailCard } from '../InventoryItemDetailCard'
import { createItem } from './testUtils'

describe('InventoryItemDetailCard gems', () => {
  it('opens gem detail on click and unequips only via 卸下', async () => {
    const user = userEvent.setup()
    const onUnsocketGem = vi.fn()
    const item = createItem({
      id: 8,
      sockets: 3,
      definition: {
        id: 8,
        name: '磐石腰带',
        type: 'belt',
        base_stats: {},
        required_level: 1,
      },
      gems: [
        {
          id: 1,
          socket_index: 0,
          gem_definition: {
            id: 148,
            name: '生命宝石',
            type: 'gem',
            base_stats: {},
            gem_stats: { max_hp: 10 },
            required_level: 1,
          },
        },
        {
          id: 2,
          socket_index: 2,
          gemDefinition: {
            id: 149,
            name: '法力宝石',
            type: 'gem',
            base_stats: {},
            gem_stats: { max_mana: 8 },
            required_level: 1,
          },
        },
      ],
    })

    render(<InventoryItemDetailCard item={item} onClose={vi.fn()} onUnsocketGem={onUnsocketGem} />)

    expect(screen.getByRole('button', { name: '查看 生命宝石 +10 生命值' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 法力宝石 +8 魔法值' })).toBeInTheDocument()
    expect(screen.getByTitle('空孔')).toBeInTheDocument()
    expect(screen.getByText('磐石腰带')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看 生命宝石 +10 生命值' }))

    expect(onUnsocketGem).not.toHaveBeenCalled()
    expect(screen.getByText('生命宝石')).toBeInTheDocument()
    expect(screen.getByText('+10 生命值')).toBeInTheDocument()
    expect(screen.queryByText('磐石腰带')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '卸下' }))

    expect(onUnsocketGem).toHaveBeenCalledWith(0)
  })

  it('returns to the parent item when closing the gem detail', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const item = createItem({
      id: 8,
      sockets: 1,
      definition: {
        id: 8,
        name: '磐石腰带',
        type: 'belt',
        base_stats: {},
        required_level: 1,
      },
      gems: [
        {
          id: 1,
          socket_index: 0,
          gem_definition: {
            id: 148,
            name: '生命宝石',
            type: 'gem',
            base_stats: {},
            gem_stats: { max_hp: 10 },
            required_level: 1,
          },
        },
      ],
    })

    render(<InventoryItemDetailCard item={item} onClose={onClose} onUnsocketGem={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '查看 生命宝石 +10 生命值' }))
    expect(screen.getByText('生命宝石')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '✕' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('磐石腰带')).toBeInTheDocument()
  })
})
