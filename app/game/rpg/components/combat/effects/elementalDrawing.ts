import { clamp01, easeOut, glow, line, noise, pointBetween, rgba, ring, shard, shieldGlyph, TAU, type EffectFrame } from './effectDrawing'
import type { EffectPoint } from './types'

/** Small, solid silhouettes keep the elements readable against the detailed pixel maps. */
export function polygon(f: EffectFrame, points: EffectPoint[], color: string, alpha: number) {
  if (alpha <= 0 || points.length < 3) return
  const { ctx } = f
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y)
  ctx.closePath()
  ctx.fillStyle = rgba(color, alpha)
  ctx.fill()
}

export function snowflake(f: EffectFrame, p: EffectPoint, radius: number, alpha: number) {
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * TAU
    const point = (distance: number, offset = 0) => ({
      x: p.x + Math.cos(angle + offset) * distance,
      y: p.y + Math.sin(angle + offset) * distance,
    })
    line(f.ctx, [p, point(radius)], f.profile.highlight, alpha, f.unit)
    line(f.ctx, [point(radius * 0.72, -0.3), point(radius * 0.5), point(radius * 0.72, 0.3)], f.profile.color, alpha, f.unit)
  }
}

export function elementalGlyph(f: EffectFrame, p: EffectPoint, size: number, alpha: number) {
  const { family, color, highlight } = f.profile
  const point = (x: number, y: number) => ({ x: p.x + x * size, y: p.y + y * size })
  if (family === 'ice' || family === 'frost') {
    snowflake(f, p, size, alpha)
  } else if (family === 'lightning') {
    polygon(f, [point(0.15, -1), point(-0.6, 0.15), point(-0.05, 0.08), point(-0.22, 1), point(0.65, -0.2), point(0.05, -0.1)], highlight, alpha)
  } else if (family === 'fire' || family === 'meteor') {
    polygon(f, [point(0.1, -1), point(-0.18, -0.24), point(-0.55, -0.55), point(-0.72, 0.38), point(-0.3, 0.9), point(0.4, 0.85), point(0.7, 0.3)], color, alpha)
    polygon(f, [point(0.06, -0.2), point(-0.3, 0.48), point(0.1, 0.88), point(0.4, 0.42)], highlight, alpha)
  } else if (family === 'summon') {
    for (let i = 0; i < 3; i++) {
      const toe = point((i - 1) * 0.6, i === 1 ? -0.65 : -0.4)
      f.ctx.fillStyle = rgba(highlight, alpha)
      f.ctx.beginPath()
      f.ctx.arc(toe.x, toe.y, size * 0.22, 0, TAU)
      f.ctx.fill()
    }
    polygon(f, [point(0, -0.1), point(-0.65, 0.7), point(0, 0.5), point(0.65, 0.7)], color, alpha)
  } else if (family === 'shield') {
    shieldGlyph(f, p, size, alpha)
  } else if (family === 'heal') {
    line(f.ctx, [point(-0.7, 0), point(0.7, 0)], highlight, alpha, 2 * f.unit)
    line(f.ctx, [point(0, -0.7), point(0, 0.7)], highlight, alpha, 2 * f.unit)
  } else {
    line(f.ctx, [point(0, -1), point(0.8, 0), point(0, 1), point(-0.8, 0), point(0, -1)], highlight, alpha, 1.3 * f.unit)
    shard(f.ctx, p, size * 0.42, -Math.PI / 2, color, alpha)
  }
}

export function drawCastingSeal(f: EffectFrame) {
  const { ctx, source, elapsed, timing, profile, unit: u } = f
  const alpha = 1 - clamp01(elapsed / (timing.castMs + 150))
  if (alpha <= 0) return
  const charge = easeOut(elapsed / timing.castMs)
  const radius = (19 + charge * 10) * u
  const ground = { x: source.x, y: source.y + 21 * u }
  glow(ctx, source, 34 * u, profile.color, alpha * 0.4)
  ring(ctx, ground, radius, profile.color, alpha * 0.75, 1.6 * u, 0.34)
  for (let i = 0; i < 4; i++) {
    const angle = i / 4 * TAU + elapsed / 800
    ring(ctx, ground, radius * 1.25, profile.highlight, alpha * 0.8, u, 0.34, angle, angle + 0.7)
  }
  // Put the element just above the actor, leaving the actor's face recognizable.
  elementalGlyph(f, { x: source.x, y: source.y - 14 * u }, (7 + charge * 4) * u, alpha)
}

export type ElementalProjectile = 'flame' | 'crystal' | 'missile'

export function elementalProjectile(f: EffectFrame, start: EffectPoint, target: EffectPoint, progress: number, bend: number, shape: ElementalProjectile, scale = 1) {
  if (progress < 0 || progress >= 1) return
  const { ctx, profile } = f
  const u = f.unit * scale
  const tip = pointBetween(start, target, progress, bend)
  const before = pointBetween(start, target, Math.max(0, progress - 0.015), bend)
  const after = pointBetween(start, target, Math.min(1, progress + 0.015), bend)
  const angle = Math.atan2(after.y - before.y, after.x - before.x)
  const length = shape === 'flame' ? 0.2 : 0.14
  // A fixed eight-sample ribbon has no particle objects to allocate or retain between frames.
  for (let i = 7; i >= 0; i--) {
    const p = pointBetween(start, target, Math.max(0, progress - i / 8 * length), bend)
    const previous = pointBetween(start, target, Math.max(0, progress - (i + 1) / 8 * length), bend)
    line(ctx, [previous, p], profile.color, (1 - i / 8) * 0.55, (shape === 'flame' ? 9 : 3) * (1 - i / 9) * u)
  }
  glow(ctx, tip, 22 * u, profile.color, 0.5)
  ctx.save()
  ctx.translate(tip.x, tip.y)
  ctx.rotate(angle)
  const p = (x: number, y: number) => ({ x: x * u, y: y * u })
  if (shape === 'flame') {
    polygon(f, [p(11, 0), p(3, -8), p(-12, -7), p(-24, -13), p(-19, -3), p(-33, 0), p(-18, 4), p(-24, 11), p(-7, 7)], profile.color, 0.95)
    polygon(f, [p(9, 0), p(0, -4), p(-19, 0), p(-1, 4)], profile.highlight, 1)
  } else if (shape === 'crystal') {
    polygon(f, [p(23, 0), p(-10, -7), p(-5, 0), p(-10, 7)], profile.color, 0.95)
    polygon(f, [p(23, 0), p(-10, -7), p(-5, 0)], profile.highlight, 0.95)
    line(ctx, [p(-14, -4), p(-22, -7)], profile.highlight, 0.7, u)
    line(ctx, [p(-14, 4), p(-22, 7)], profile.color, 0.8, u)
  } else {
    polygon(f, [p(11, 0), p(0, -6), p(-13, 0), p(0, 6)], profile.color, 1)
    polygon(f, [p(11, 0), p(0, -3), p(-6, 0), p(0, 3)], profile.highlight, 1)
  }
  ctx.restore()
}

/** Each target gets fewer motes in AOE casts; total work stays bounded at five enemies. */
export function detailCount(f: EffectFrame, count: number) {
  return Math.max(4, Math.ceil(count / Math.sqrt(Math.max(1, f.targets.length))))
}

export function elementalImpact(f: EffectFrame, target: EffectPoint, age: number, shape: ElementalProjectile) {
  if (age < 0) return
  const { ctx, profile, unit: u, timing } = f
  const t = clamp01(age / (timing.durationMs - timing.hitMs))
  const fade = (1 - t) ** 2
  const flash = 1 - clamp01(age / 150)
  glow(ctx, target, (20 + 12 * flash) * u, profile.color, flash * 0.65)
  if (shape === 'crystal') {
    snowflake(f, target, (12 + easeOut(t) * 24) * u, fade * 0.8)
  } else if (shape === 'missile') {
    for (let i = 0; i < 2; i++) {
      ring(ctx, target, (12 + easeOut(t) * 24 + i * 9) * u, i ? profile.color : profile.highlight, fade * 0.8, 1.3 * u, 0.65, i * Math.PI + t, i * Math.PI + t + Math.PI * 1.35)
    }
  } else {
    elementalGlyph(f, target, (13 + flash * 5) * u, flash * 0.95)
    glow(ctx, target, 8 * u, profile.highlight, flash * 0.7)
    ring(ctx, { x: target.x, y: target.y + 16 * u }, (12 + easeOut(t) * 30) * u, profile.color, fade * 0.65, 2 * u, 0.35)
  }
  const count = detailCount(f, 14)
  for (let i = 0; i < count; i++) {
    const angle = i / count * TAU + noise(i, f.seed) * 0.45
    const distance = (18 + noise(i + 20, f.seed) * 28) * u * easeOut(t)
    const p = { x: target.x + Math.cos(angle) * distance, y: target.y + Math.sin(angle) * distance * 0.6 - (shape === 'flame' ? t * t * 35 * u : 0) }
    shard(ctx, p, (shape === 'crystal' ? 8 : 4) * u * fade, shape === 'flame' ? -Math.PI / 2 : angle, i % 3 ? profile.color : profile.highlight, fade)
  }
}
