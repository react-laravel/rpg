import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ItemImagePreview } from '../ItemImagePreview'
import type { GameItem } from '@/app/game/rpg/types'

const item = { id: 1, quality: 'magic', definition_id: 1041, definition: { id: 1041, name: '流风法杖', type: 'weapon', icon: 'mage-set-forbidden-weapon.png' } } as GameItem

describe('item image preview', () => {
  it('opens the pixel image and returns to the original detail without closing its parent', async () => {
    const user = userEvent.setup()
    const closeParent = vi.fn()
    render(<div onClick={closeParent}><ItemImagePreview item={item}><span>装备缩略图</span></ItemImagePreview></div>)
    const trigger = screen.getByRole('button', { name: '查看流风法杖大图' })
    await user.click(trigger)
    expect(await screen.findByRole('dialog', { name: '流风法杖' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '流风法杖' })).toHaveAttribute('src', expect.stringContaining('/pixel-v1/items/wind-weapon.png'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(closeParent).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: '关闭' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(closeParent).not.toHaveBeenCalled()
  })
})
