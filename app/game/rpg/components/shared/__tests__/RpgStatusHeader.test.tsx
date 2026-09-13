import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../../stores/gameStore'
import { RpgStatusHeader } from '../RpgStatusHeader'

describe('RpgStatusHeader', () => {
  beforeEach(() => {
    useGameStore.setState({
      character: null,
      combatStats: null,
      currentHp: null,
      currentMana: null,
      experienceTable: {},
    })
  })

  it('should render a single-row header with borderless orbs and no resource text', () => {
    useGameStore.setState({
      character: {
        id: 1,
        name: 'Hero',
        level: 2,
        experience: 100,
        copper: 123,
      } as any,
      combatStats: {
        max_hp: 100,
        max_mana: 50,
      } as any,
      currentHp: 80,
      currentMana: 30,
      experienceTable: { 3: 1000 },
    })

    render(<RpgStatusHeader />)

    expect(screen.getByText('Lv.2')).toBeInTheDocument()
    expect(screen.getByText('Hero')).toBeInTheDocument()
    expect(screen.queryByText('生命')).not.toBeInTheDocument()
    expect(screen.queryByText('法力')).not.toBeInTheDocument()
    expect(screen.queryByText('80')).not.toBeInTheDocument()
    expect(screen.queryByText('30')).not.toBeInTheDocument()
    expect(screen.queryByText(/EXP/i)).not.toBeInTheDocument()

    const hpOrb = screen.getByRole('progressbar', { name: /生命/ })
    const mpOrb = screen.getByRole('progressbar', { name: /法力/ })
    expect(hpOrb).toHaveAttribute('aria-valuenow', '80')
    expect(mpOrb).toHaveAttribute('aria-valuenow', '60')
  })

  it('should return null when character is null', () => {
    const { container } = render(<RpgStatusHeader />)
    expect(container.firstChild).toBeNull()
  })
})
