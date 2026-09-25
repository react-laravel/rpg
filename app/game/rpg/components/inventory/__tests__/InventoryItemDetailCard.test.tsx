import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InventoryItemDetailCard } from '../InventoryItemDetailCard'
import { createItem } from './testUtils'

describe('InventoryItemDetailCard gems', () => {
  it('lists each socketed gem by name and removes that socket', async () => {
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

    expect(screen.getByRole('button', { name: '取下 生命宝石' })).toHaveTextContent('+10 生命值')
    expect(screen.getByRole('button', { name: '取下 法力宝石' })).toHaveTextContent('+8 魔法值')
    expect(screen.getByText('空孔')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '取下 ▾' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '取下 生命宝石' }))

    expect(onUnsocketGem).toHaveBeenCalledWith(0)
  })
})
