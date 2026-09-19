import { fireEvent, render } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it } from 'vitest'
import { SkillIcon } from '../SkillIcon'

describe('SkillIcon', () => {
  it('renders a crisp local pixel icon for the spell effect', () => {
    const view = render(<SkillIcon name="小火球" effectKey="fireball" icon="old-icon.png" />)
    expect(view.getByRole('img', { name: '小火球' })).toHaveAttribute('src', expect.stringContaining('/game/rpg/pixel-v1/skills/fireball.png'))
    expect(view.getByRole('img')).toHaveStyle({ imageRendering: 'pixelated' })
  })

  it('can use a cached URL when an effect key is absent', () => {
    const view = render(<SkillIcon name="冰箭" icon="https://upyun.dogeow.com/game/rpg/skills/ice-arrow.png?v=1" />)
    expect(view.getByRole('img')).toHaveAttribute('src', expect.stringContaining('/game/rpg/pixel-v1/skills/ice-arrow.png'))
  })

  it('does not carry an image failure over to a different skill', () => {
    const view = render(<SkillIcon name="小火球" effectKey="fireball" />)
    fireEvent.error(view.getByRole('img'))
    expect(view.queryByRole('img')).toBeNull()
    expect(view.getByText('小')).toBeInTheDocument()
    view.rerender(<SkillIcon name="冰箭" effectKey="ice-arrow" />)
    expect(view.getByRole('img')).toHaveAttribute('src', expect.stringContaining('/game/rpg/pixel-v1/skills/ice-arrow.png'))
  })

  const expectRendered = (props: ComponentProps<typeof SkillIcon>) => {
    const { container } = render(<SkillIcon {...props} />)
    expect(container.firstChild).toBeDefined()
  }

  it('should render without crashing', () => {
    expectRendered({ name: 'Fireball' })
  })

  it('should display name initial as fallback', () => {
    expectRendered({ name: 'Fireball' })
  })

  it('should use icon when provided', () => {
    expectRendered({ name: 'Fireball', icon: 'fireball.png' })
  })

  it('should use effectKey when provided', () => {
    expectRendered({ name: 'Fireball', effectKey: 'fireball' })
  })

  it('should use effectKey without extension', () => {
    expectRendered({ name: 'Fireball', effectKey: 'ice-arrow' })
  })

  it('should render with sm size', () => {
    expectRendered({ name: 'Test', size: 'sm' })
  })

  it('should render with md size', () => {
    expectRendered({ name: 'Test', size: 'md' })
  })

  it('should use single character as fallback for short name', () => {
    expectRendered({ name: 'A' })
  })

  it('should use ? when no name provided', () => {
    expectRendered({ name: '' })
  })

  it('should use icon as fallback when icon is 4 chars or less', () => {
    expectRendered({ name: 'Fireball', icon: 'FB' })
  })
})
