import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InventoryItemDetailCard } from '../InventoryItemDetailCard'
import { createItem } from './testUtils'

const socketedBelt = () =>
  createItem({
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

describe('InventoryItemDetailCard gems', () => {
  it('expands gem details inline and unequips only via 卸下', async () => {
    const user = userEvent.setup()
    const onUnsocketGem = vi.fn()
    const item = socketedBelt()

    render(<InventoryItemDetailCard item={item} onClose={vi.fn()} onUnsocketGem={onUnsocketGem} />)

    expect(screen.getByRole('button', { name: '查看 生命宝石 +10 生命值' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 法力宝石 +8 魔法值' })).toBeInTheDocument()
    expect(screen.getByTitle('空孔')).toBeInTheDocument()
    expect(screen.getByText('磐石腰带')).toBeInTheDocument()
    expect(screen.queryByTestId('gem-expand-panel')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看 生命宝石 +10 生命值' }))

    expect(onUnsocketGem).not.toHaveBeenCalled()
    expect(screen.getByText('磐石腰带')).toBeInTheDocument()
    expect(screen.getByTestId('gem-expand-panel')).toBeInTheDocument()
    expect(screen.getByTestId('gem-expand-panel')).toHaveTextContent('生命宝石')
    expect(screen.getByTestId('gem-expand-panel')).toHaveTextContent('+10 生命值')
    expect(screen.getByRole('button', { name: '收起 生命宝石 +10 生命值' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )

    await user.click(screen.getByRole('button', { name: '卸下' }))

    expect(onUnsocketGem).toHaveBeenCalledWith(0)
    expect(screen.queryByTestId('gem-expand-panel')).not.toBeInTheDocument()
  })

  it('collapses the panel when the same gem is clicked again', async () => {
    const user = userEvent.setup()
    const item = socketedBelt()

    render(<InventoryItemDetailCard item={item} onClose={vi.fn()} onUnsocketGem={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '查看 生命宝石 +10 生命值' }))
    expect(screen.getByTestId('gem-expand-panel')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '收起 生命宝石 +10 生命值' }))
    expect(screen.queryByTestId('gem-expand-panel')).not.toBeInTheDocument()
    expect(screen.getByText('磐石腰带')).toBeInTheDocument()
  })

  it('keeps a single expansion and switches when another gem is opened', async () => {
    const user = userEvent.setup()
    const item = socketedBelt()

    render(<InventoryItemDetailCard item={item} onClose={vi.fn()} onUnsocketGem={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '查看 生命宝石 +10 生命值' }))
    expect(screen.getByTestId('gem-expand-panel')).toHaveTextContent('生命宝石')

    await user.click(screen.getByRole('button', { name: '查看 法力宝石 +8 魔法值' }))
    expect(screen.getAllByTestId('gem-expand-panel')).toHaveLength(1)
    expect(screen.getByTestId('gem-expand-panel')).toHaveTextContent('法力宝石')
    expect(screen.getByTestId('gem-expand-panel')).toHaveTextContent('+8 魔法值')
    expect(screen.getByText('磐石腰带')).toBeInTheDocument()
  })

  it('collapses via the panel collapse control without closing the item', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const item = socketedBelt()

    render(<InventoryItemDetailCard item={item} onClose={onClose} onUnsocketGem={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '查看 生命宝石 +10 生命值' }))
    await user.click(screen.getByRole('button', { name: '收起宝石详情' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByTestId('gem-expand-panel')).not.toBeInTheDocument()
    expect(screen.getByText('磐石腰带')).toBeInTheDocument()
  })
})
