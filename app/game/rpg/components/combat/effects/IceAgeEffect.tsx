import { CanvasSkillEffect } from './CanvasSkillEffect'
import type { EffectBaseProps } from './types'

export function IceAgeEffect(props: EffectBaseProps) {
  return <CanvasSkillEffect {...props} type="ice-age" />
}
