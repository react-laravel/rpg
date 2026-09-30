import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GemSelectorDialog } from '../GemSelectorDialog'
import { createItem } from './testUtils'

const gem = createItem({
  id: 2,
  quantity: 3,
  definition: { id: 2, name: 'Ruby', type: 'gem', base_stats: {}, required_level: 1 },
})

describe('GemSelectorDialog', () => {
  it('shows the stack quantity and selects the first unoccupied socket', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <GemSelectorDialog
        isOpen
        socketItem={createItem({
          sockets: 3,
          gems: [{ id: 5, socket_index: 0, gemDefinition: gem.definition }],
        })}
        gems={[gem]}
        onClose={onClose}
        onSelect={onSelect}
      />
    )

    expect(screen.getByText('选择宝石 (还可镶嵌 2 个)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Ruby ×3/ }))
    expect(onSelect).toHaveBeenCalledWith(gem, 1)

    await userEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('blocks selection while a request is pending but still allows dismissal', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <GemSelectorDialog
        isOpen
        isSocketing
        socketItem={createItem({ sockets: 3 })}
        gems={[gem]}
        onClose={onClose}
        onSelect={onSelect}
      />
    )

    const button = screen.getByRole('button', { name: /Ruby ×3/ })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('blocks selection when all sockets are occupied', async () => {
    const onSelect = vi.fn()
    render(
      <GemSelectorDialog
        isOpen
        socketItem={createItem({
          sockets: 1,
          gems: [{ id: 5, socket_index: 0, gemDefinition: gem.definition }],
        })}
        gems={[gem]}
        onClose={vi.fn()}
        onSelect={onSelect}
      />
    )

    const button = screen.getByRole('button', { name: /Ruby ×3/ })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
