import { CanvasSkillEffect } from './CanvasSkillEffect'
import type { EffectBaseProps } from './types'

export function IceArrowEffect(props: EffectBaseProps) {
  return <CanvasSkillEffect {...props} type="ice-arrow" />
}
