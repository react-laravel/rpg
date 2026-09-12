import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GameNavigation, type GameTab } from '../GameNavigation'

function Navigation() {
  const [tab, setTab] = useState<GameTab>('combat')
  return <GameNavigation activeTab={tab} onTabChange={setTab} />
}

describe('game navigation', () => {
  it('keeps keyboard focus and selection together, including wrapping and Home/End', () => {
    render(<Navigation />)
    const combat = screen.getByRole('tab', { name: '战斗' })
    fireEvent.keyDown(combat, { key: 'ArrowLeft' })
    const settings = screen.getByRole('tab', { name: '设置' })
    expect(settings).toHaveFocus()
    expect(settings).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(settings, { key: 'Home' })
    expect(combat).toHaveFocus()
    fireEvent.keyDown(combat, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: '背包' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', { name: '背包' }), { key: 'End' })
    expect(settings).toHaveFocus()
    expect(screen.getAllByRole('tab').filter(tab => tab.tabIndex === 0)).toHaveLength(1)
  })
})
