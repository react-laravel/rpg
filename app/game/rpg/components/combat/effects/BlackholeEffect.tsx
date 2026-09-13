import { CanvasSkillEffect } from './CanvasSkillEffect'
import type { EffectBaseProps } from './types'

export function BlackholeEffect(props: EffectBaseProps) {
  return <CanvasSkillEffect {...props} type="blackhole" />
}
