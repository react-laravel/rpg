import { CanvasSkillEffect } from './CanvasSkillEffect'
import type { EffectBaseProps } from './types'

export function MeteorStormEffect(props: EffectBaseProps) {
  return <CanvasSkillEffect {...props} type="meteor-storm" />
}
