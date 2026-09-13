import { CanvasSkillEffect } from './CanvasSkillEffect'
import type { EffectBaseProps } from './types'

export function LightningEffect(props: EffectBaseProps) {
  return <CanvasSkillEffect {...props} type="lightning" />
}
