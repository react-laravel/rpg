import { clamp01, glow, ring, type EffectFrame } from './effectDrawing'
import { drawCastingSeal, elementalGlyph } from './elementalDrawing'
import { drawMagicEffect } from './magicEffects'
import { drawPhysicalEffect } from './physicalEffects'

/** Analytic drawing: a given elapsed time, viewport and seed always produces the same frame. */
export function renderSkillEffect(frame: EffectFrame) {
  const {ctx,width,height,profile,timing,elapsed,unit,source}=frame
  // Keep direct/legacy callers bounded too, not only the React canvas wrapper.
  const targets = frame.targets.slice(0, 5)
  frame = { ...frame, targets }
  ctx.clearRect(0,0,width,height)
  if(elapsed>=timing.durationMs) return
  ctx.save()
  // Build one non-overlapping hole per HUD rectangle; clipping keeps bright effects off text.
  // Sequential clips also handle overlapping labels without the even-odd overlap filling in.
  for (const rect of frame.exclusions?.slice(0, 14) ?? []) {
    if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) continue
    ctx.beginPath()
    ctx.rect(0, 0, width, height)
    ctx.rect(rect.x, rect.y, rect.width, rect.height)
    ctx.clip('evenodd')
  }
  ctx.globalCompositeOperation='lighter'

  if(frame.reducedMotion) {
    const alpha=Math.sin(clamp01(elapsed/timing.durationMs)*Math.PI)*0.55
    const points=profile.target==='self'?[profile.family==='summon' ? (frame.companion ?? source) : source]:targets
    for(const p of points) {
      glow(ctx,p,30*unit,profile.color,alpha*0.35)
      ring(ctx,p,26*unit,profile.highlight,alpha,1.6*unit)
      elementalGlyph(frame,p,11*unit,alpha)
    }
  } else {
    // One compact casting seal at the actor, fading as the projectile leaves.
    drawCastingSeal(frame)
    if(profile.target==='enemy'&&elapsed<timing.hitMs) {
      for(const p of targets) ring(ctx,p,18*unit,profile.color,Math.min(0.32,elapsed/600),unit,0.5)
    }
    if (targets.length || profile.target === 'self') drawMagicEffect(frame)
    drawPhysicalEffect(frame)
  }
  ctx.restore()
}
