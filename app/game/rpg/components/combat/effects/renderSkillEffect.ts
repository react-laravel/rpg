import { clamp01, glow, ring, shard, TAU, type EffectFrame } from './effectDrawing'
import { drawMagicEffect } from './magicEffects'
import { drawPhysicalEffect } from './physicalEffects'

/** Analytic drawing: a given elapsed time, viewport and seed always produces the same frame. */
export function renderSkillEffect(frame: EffectFrame) {
  const {ctx,width,height,profile,timing,elapsed,unit,source,targets}=frame
  ctx.clearRect(0,0,width,height)
  if(elapsed>=timing.durationMs) return
  ctx.save()
  ctx.globalCompositeOperation='lighter'

  if(frame.reducedMotion) {
    const alpha=Math.sin(clamp01(elapsed/timing.durationMs)*Math.PI)*0.55
    const points=profile.target==='self'?[source]:targets
    for(const p of points) {
      glow(ctx,p,30*unit,profile.color,alpha*0.35)
      ring(ctx,p,26*unit,profile.highlight,alpha,1.6*unit)
    }
  } else {
    // One compact casting seal at the actor, fading as the projectile leaves.
    const castAlpha=Math.max(0,1-elapsed/(timing.castMs+160))
    if(castAlpha>0) {
      const r=(18+clamp01(elapsed/timing.castMs)*12)*unit
      glow(ctx,source,45*unit,profile.color,castAlpha*0.6)
      ring(ctx,source,r,profile.highlight,castAlpha*0.85,1.4*unit,0.48)
      for(let i=0;i<5;i++) {
        const angle=i/5*TAU+elapsed/450
        shard(ctx,{x:source.x+Math.cos(angle)*r,y:source.y+Math.sin(angle)*r*0.48},3*unit,angle,profile.color,castAlpha)
      }
    }
    if(profile.target==='enemy'&&elapsed<timing.hitMs) {
      for(const p of targets) ring(ctx,p,18*unit,profile.color,Math.min(0.32,elapsed/600),unit,0.5)
    }
    drawMagicEffect(frame)
    drawPhysicalEffect(frame)
  }
  ctx.restore()
}
