import { CanvasSkillEffect } from './CanvasSkillEffect'
import type { EffectBaseProps } from './types'

export function MeteorEffect(props: EffectBaseProps) {
  return <CanvasSkillEffect {...props} type="meteor" />
}
