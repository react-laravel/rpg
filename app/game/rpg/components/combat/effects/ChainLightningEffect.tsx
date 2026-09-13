import { CanvasSkillEffect } from './CanvasSkillEffect'
import type { EffectBaseProps } from './types'

export function ChainLightningEffect(props: EffectBaseProps) {
  return <CanvasSkillEffect {...props} type="chain-lightning" />
}
