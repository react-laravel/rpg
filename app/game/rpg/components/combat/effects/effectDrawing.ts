import type { EffectProfile, SkillEffectType } from './effectRegistry'
import type { EffectTiming } from './effectTimeline'
import type { EffectPoint } from './types'

export interface EffectFrame {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  unit: number
  source: EffectPoint
  targets: EffectPoint[]
  elapsed: number
  timing: EffectTiming
  profile: EffectProfile
  type: SkillEffectType
  seed: number
  reducedMotion: boolean
}
export const TAU = Math.PI * 2
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
export const easeOut = (n: number) => 1 - (1 - clamp01(n)) ** 3
export const mix = (a: number, b: number, t: number) => a + (b - a) * t
export const noise = (i: number, seed = 0) => {
  const n = Math.sin(i * 127.1 + seed * 0.17) * 43758.5453
  return n - Math.floor(n)
}
export const pointBetween = (a: EffectPoint, b: EffectPoint, t: number, bend = 0): EffectPoint => ({
  x: mix(a.x, b.x, t) + Math.sin(Math.PI * t) * bend,
  y: mix(a.y, b.y, t) - Math.sin(Math.PI * t) * Math.abs(bend) * 0.65,
})
export function rgba(hex: string, alpha: number) {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${clamp01(alpha)})`
}
export function glow(ctx: CanvasRenderingContext2D, point: EffectPoint, radius: number, color: string, alpha = 1) {
  if (radius <= 0 || alpha <= 0) return
  const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
  gradient.addColorStop(0, rgba(color, alpha * 0.65))
  gradient.addColorStop(0.3, rgba(color, alpha * 0.32))
  gradient.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = gradient
  ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, TAU); ctx.fill()
}
export function ring(ctx: CanvasRenderingContext2D, p: EffectPoint, r: number, color: string, alpha: number, lineWidth = 2, flatten = 1, start = 0, end = TAU) {
  if (r <= 0 || alpha <= 0) return
  ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = lineWidth
  ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * flatten, 0, start, end); ctx.stroke()
}
export function line(ctx: CanvasRenderingContext2D, points: EffectPoint[], color: string, alpha: number, width = 2) {
  if (points.length < 2 || alpha <= 0) return
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.strokeStyle = rgba(color, alpha * 0.15); ctx.lineWidth = width * 4; ctx.stroke()
  ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = width; ctx.stroke()
}
export function shard(ctx: CanvasRenderingContext2D, p: EffectPoint, size: number, angle: number, color: string, alpha: number) {
  if (size <= 0 || alpha <= 0) return
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle)
  ctx.fillStyle = rgba(color, alpha)
  ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.3, -size * 0.22)
  ctx.lineTo(-size * 0.65, 0); ctx.lineTo(-size * 0.3, size * 0.22); ctx.closePath(); ctx.fill()
  ctx.restore()
}
export function burst(f: EffectFrame, target: EffectPoint, age: number, { color = f.profile.color, count = 18, radius = 70, ice = false } = {}) {
  if (age < 0 || age > 650) return
  const t = age / 650, fade = (1 - t) ** 1.7
  for (let i = 0; i < count; i++) {
    const angle = noise(i, f.seed) * TAU
    const distance = (0.2 + noise(i + 50, f.seed) * 0.8) * radius * f.unit * easeOut(t)
    const p = { x: target.x + Math.cos(angle) * distance, y: target.y + Math.sin(angle) * distance * 0.8 + t * t * 18 * f.unit }
    const size = (1.2 + noise(i + 100, f.seed) * (ice ? 7 : 3)) * f.unit * fade
    if (ice) shard(f.ctx, p, size, angle, i % 3 ? color : f.profile.highlight, fade)
    else line(f.ctx, [p, { x: p.x - Math.cos(angle) * size * 2, y: p.y - Math.sin(angle) * size * 2 }], i % 3 ? color : f.profile.highlight, fade, Math.max(0.5, size * 0.55))
  }
}
export function impact(f: EffectFrame, target: EffectPoint, age: number, scale = 1) {
  if (age < 0) return
  const t = clamp01(age / (f.timing.durationMs - f.timing.hitMs))
  const flash = Math.max(0, 1 - age / 170)
  glow(f.ctx, target, (25 + 20 * flash) * f.unit * scale, f.profile.color, flash * 0.95)
  glow(f.ctx, target, 12 * f.unit * scale, f.profile.highlight, flash)
  ring(f.ctx, target, (10 + easeOut(t) * 48) * f.unit * scale, f.profile.color, (1 - t) * 0.7, (1 - t) * 2.5 * f.unit + 0.3, 0.65)
  burst(f, target, age, { radius: 65 * scale })
}
export function projectile(f: EffectFrame, start: EffectPoint, target: EffectPoint, progress: number, bend = 0, shape: 'orb' | 'arrow' | 'ice' = 'orb', scale = 1) {
  if (progress < 0 || progress >= 1) return
  const p = clamp01(progress), u = f.unit * scale
  const tip = pointBetween(start, target, p, bend)
  for (let i = 9; i >= 0; i--) {
    const end = pointBetween(start, target, Math.max(0, p - i * 0.018), bend)
    const begin = pointBetween(start, target, Math.max(0, p - (i + 1) * 0.018), bend)
    line(f.ctx, [begin, end], f.profile.color, (1 - i / 10) * 0.7, (shape === 'orb' ? 8 : 3) * (1 - i / 11) * u)
  }
  glow(f.ctx, tip, (shape === 'orb' ? 28 : 18) * u, f.profile.color, 0.9)
  const before = pointBetween(start, target, Math.max(0, p - 0.01), bend)
  const angle = Math.atan2(tip.y - before.y, tip.x - before.x)
  if (shape === 'orb') {
    glow(f.ctx, tip, 10 * u, f.profile.highlight, 1)
    f.ctx.fillStyle = f.profile.highlight
    f.ctx.beginPath(); f.ctx.arc(tip.x, tip.y, 4.5 * u, 0, TAU); f.ctx.fill()
  } else {
    shard(f.ctx, tip, (shape === 'ice' ? 24 : 17) * u, angle, f.profile.highlight, 1)
    if (shape === 'arrow') {
      const tail = { x: tip.x - Math.cos(angle) * 36 * u, y: tip.y - Math.sin(angle) * 36 * u }
      line(f.ctx, [tail, tip], f.profile.color, 0.95, 1.6 * u)
      shard(f.ctx, tail, 7 * u, angle + Math.PI, f.profile.color, 0.8)
    }
  }
}
export function bolt(f: EffectFrame, start: EffectPoint, end: EffectPoint, progress: number, alpha = 1, seedOffset = 0) {
  const points: EffectPoint[] = [start]
  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const jitter = Math.min(18 * f.unit, distance * 0.12)
  const segments = 12
  for (let i = 1; i <= segments; i++) {
    const t = Math.min(i / segments, clamp01(progress))
    points.push({ x: mix(start.x, end.x, t) + Math.sin(t * Math.PI) * (noise(i + seedOffset, f.seed) - 0.5) * jitter * 2, y: mix(start.y, end.y, t) })
    if (t >= progress) break
  }
  line(f.ctx, points, f.profile.color, alpha * 0.6, 6 * f.unit)
  line(f.ctx, points, f.profile.highlight, alpha, 1.7 * f.unit)
}
export function shieldGlyph(f: EffectFrame, p: EffectPoint, size: number, alpha: number) {
  const {ctx} = f
  ctx.save(); ctx.translate(p.x, p.y)
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.8, -size * 0.6)
  ctx.quadraticCurveTo(size, size * 0.4, 0, size)
  ctx.quadraticCurveTo(-size, size * 0.4, -size * 0.8, -size * 0.6); ctx.closePath()
  ctx.fillStyle = rgba(f.profile.color, alpha * 0.14); ctx.fill()
  ctx.strokeStyle = rgba(f.profile.highlight, alpha); ctx.lineWidth = 2 * f.unit; ctx.stroke()
  line(ctx, [{x:0,y:-size * 0.5},{x:0,y:size * 0.5}], f.profile.color, alpha, 2 * f.unit)
  ctx.restore()
}
