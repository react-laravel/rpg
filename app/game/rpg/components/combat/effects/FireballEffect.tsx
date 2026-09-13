import { CanvasSkillEffect } from './CanvasSkillEffect'
import type { EffectBaseProps } from './types'

export function FireballEffect(props: EffectBaseProps) {
  return <CanvasSkillEffect {...props} type="fireball" />
}
