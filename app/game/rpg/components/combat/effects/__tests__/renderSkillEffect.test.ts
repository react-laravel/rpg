import { describe, expect, it, vi } from 'vitest'
import { renderSkillEffect } from '../renderSkillEffect'
import { EFFECT_PROFILES, type SkillEffectType } from '../effectRegistry'
import { getEffectTiming } from '../effectTimeline'
import { detailCount } from '../elementalDrawing'
import type { EffectFrame } from '../effectDrawing'

/** Strict command recorder: jsdom's permissive canvas stub cannot catch NaN/radius regressions. */
function recordingContext() {
  const calls: unknown[][] = []
  let depth = 0
  const properties: Record<string, unknown> = {}
  const gradient = { addColorStop(offset: number, color: string) {
    expect(Number.isFinite(offset)).toBe(true)
    expect(offset).toBeGreaterThanOrEqual(0)
    expect(offset).toBeLessThanOrEqual(1)
    expect(color).not.toMatch(/NaN|Infinity/)
    calls.push(['addColorStop', offset, color])
  } }
  const methods: Record<string, (...args: unknown[]) => unknown> = {}
  for (const name of ['clearRect', 'save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'ellipse', 'fill', 'stroke', 'translate', 'rotate', 'scale', 'rect', 'clip', 'createRadialGradient']) {
    methods[name] = (...args: unknown[]) => {
      for (const arg of args) if (typeof arg === 'number') expect(Number.isFinite(arg), `${name} received ${arg}`).toBe(true)
      if (name === 'arc') expect(args[2]).toBeGreaterThanOrEqual(0)
      if (name === 'ellipse') {
        expect(args[2]).toBeGreaterThanOrEqual(0)
        expect(args[3]).toBeGreaterThanOrEqual(0)
      }
      if (name === 'save') depth++
      if (name === 'restore') { depth--; expect(depth).toBeGreaterThanOrEqual(0) }
      calls.push([name, ...args])
      return name === 'createRadialGradient' ? gradient : undefined
    }
  }
  const ctx = new Proxy({}, {
    get(_target, key: string) {
      if (key in methods) return methods[key]
      if (key in properties) return properties[key]
      throw new Error(`Unexpected Canvas API ${key}`)
    },
    set(_target, key: string, value: unknown) {
      if (typeof value === 'number') expect(Number.isFinite(value), `${key} received ${value}`).toBe(true)
      if (typeof value === 'string') expect(value).not.toMatch(/NaN|Infinity/)
      if (key === 'lineWidth') expect(value).toBeGreaterThan(0)
      if (key === 'globalAlpha') { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1) }
      properties[key] = value
      calls.push(['set', key, value === gradient ? 'gradient' : value])
      return true
    },
  }) as CanvasRenderingContext2D
  return { ctx, calls, assertBalanced: () => expect(depth).toBe(0) }
}

const profiles = Object.keys(EFFECT_PROFILES) as SkillEffectType[]
const targets = [34, 90, 147, 203, 260].map(x => ({ x, y: 113 }))
function frame(type: SkillEffectType, overrides: Partial<EffectFrame> = {}) {
  const record = recordingContext()
  const profile = EFFECT_PROFILES[type]
  const value: EffectFrame = {
    ctx: record.ctx, width: 294, height: 294, unit: 0.7,
    source: { x: 147, y: 254 }, targets,
    elapsed: 0, timing: getEffectTiming(profile), profile, type,
    seed: 17, reducedMotion: false,
    exclusions: [{ x: 119, y: 186, width: 56, height: 36 }, { x: 6, y: 64, width: 56, height: 19 }],
    ...overrides,
  }
  return { ...record, value }
}
function commands(type: SkillEffectType, overrides: Partial<EffectFrame>) {
  const f = frame(type, overrides)
  renderSkillEffect(f.value)
  f.assertBalanced()
  return f.calls
}

describe('renderSkillEffect strict Canvas regression coverage', () => {
  it('covers all 33 registered effect profiles', () => expect(profiles).toHaveLength(33))

  it.each(profiles)('%s emits only finite, valid and bounded drawing commands across phases', type => {
    for (const reducedMotion of [false, true]) {
      const timing = getEffectTiming(EFFECT_PROFILES[type], undefined, reducedMotion)
      const samples = [0, timing.castMs - 1, timing.castMs, (timing.castMs + timing.hitMs) / 2, timing.hitMs - 1, timing.hitMs, timing.hitMs + 100, timing.durationMs - 1, timing.durationMs]
      for (const targetCount of [0, 1, 5]) for (const elapsed of samples) {
        const calls = commands(type, { timing, reducedMotion, targets: targets.slice(0, targetCount), elapsed })
        expect(calls.length).toBeLessThan(12_000)
        if (elapsed === timing.hitMs && (targetCount > 0 || EFFECT_PROFILES[type].target === 'self')) {
          expect(calls.some(c => c[0] === 'fill' || c[0] === 'stroke')).toBe(true)
        }
      }
    }
  })

  it.each(profiles)('%s repeats deterministic frames without random sampling or state', type => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('Frame-dependent randomness is forbidden') })
    try {
      const timing = getEffectTiming(EFFECT_PROFILES[type])
      for (const elapsed of [timing.castMs / 2, (timing.castMs + timing.hitMs) / 2, timing.hitMs, timing.hitMs + 200]) {
        expect(commands(type, { elapsed })).toEqual(commands(type, { elapsed }))
      }
    } finally { random.mockRestore() }
  })

  it.each(profiles)('%s limits direct callers to five targets', type => {
    const timing = getEffectTiming(EFFECT_PROFILES[type])
    const tooManyTargets = [...targets, ...targets, ...targets, ...targets]
    for (const reducedMotion of [false, true]) for (const elapsed of [timing.castMs / 2, timing.hitMs - 1, timing.hitMs + 100]) {
      expect(commands(type, { targets: tooManyTargets, elapsed, reducedMotion }))
        .toEqual(commands(type, { targets, elapsed, reducedMotion }))
    }
  })

  it.each(profiles)('%s clears the finished frame without further drawing', type => {
    const timing = getEffectTiming(EFFECT_PROFILES[type])
    for (const elapsed of [timing.durationMs, timing.durationMs + 60_000]) {
      expect(commands(type, { elapsed })).toEqual([['clearRect', 0, 0, 294, 294]])
    }
  })

  it('draws summon seals at the measured companion and falls back to the caster', () => {
    const timing = getEffectTiming(EFFECT_PROFILES['charm-light'])
    const elapsed = (timing.castMs + timing.hitMs) / 2
    const companion = { x: 70, y: 254 }
    const actual = commands('charm-light', { elapsed, companion })
    const fallback = commands('charm-light', { elapsed })
    expect(actual).not.toEqual(fallback)
    expect(actual.some(c => c[0] === 'createRadialGradient' && c[1] === 70 && c[2] === 254)).toBe(true)
    expect(fallback.some(c => c[0] === 'createRadialGradient' && c[1] === 147 && c[2] === 254)).toBe(true)
    expect(actual).toEqual(commands('charm-light', { elapsed, companion }))
  })

  it('uses the companion for reduced-motion summon marks while other self skills stay on the caster', () => {
    const timing = getEffectTiming(EFFECT_PROFILES['charm-light'], undefined, true)
    const common = { elapsed: timing.hitMs, timing, reducedMotion: true }
    const companion = { x: 70, y: 254 }
    const centers = (calls: unknown[][]) => calls.filter(c => c[0] === 'createRadialGradient').map(c => c.slice(1, 3))
    expect(centers(commands('charm-light', { ...common, companion }))).toEqual([[70, 254]])
    expect(centers(commands('charm-light', common))).toEqual([[147, 254]])
    expect(commands('shield', { ...common, companion })).toEqual(commands('shield', common))
  })

  it('decreases per-target particle detail for an AOE without exceeding a fixed five-target budget', () => {
    const f = frame('element-cataclysm').value
    for (const count of [7, 8, 10, 12, 14]) {
      const detail = [1, 2, 3, 4, 5].map(n => detailCount({ ...f, targets: targets.slice(0, n) }, count))
      expect(detail[0]).toBe(count)
      for (let i = 1; i < detail.length; i++) expect(detail[i]).toBeLessThanOrEqual(detail[i - 1])
      expect(detail[4] * 5).toBeLessThanOrEqual(count * 5)
      expect(detail[4]).toBeGreaterThanOrEqual(4)
    }
  })

  it('ignores malformed or empty exclusion rectangles', () => {
    const calls = commands('fireball', {
      elapsed: 250,
      exclusions: [
        { x: NaN, y: 0, width: 10, height: 10 },
        { x: 0, y: Infinity, width: 10, height: 10 },
        { x: 0, y: 0, width: -1, height: 10 },
        { x: 0, y: 0, width: 10, height: 0 },
        { x: 3, y: 4, width: 5, height: 6 },
      ],
    })
    expect(calls.filter(c => c[0] === 'clip')).toEqual([['clip', 'evenodd']])
    expect(calls.filter(c => c[0] === 'rect')).toEqual([['rect', 0, 0, 294, 294], ['rect', 3, 4, 5, 6]])
  })

  it('bounds exclusions at 14 and clips overlapping labels separately', () => {
    const exclusions = Array.from({ length: 30 }, (_, i) => ({ x: i, y: i, width: 30, height: 30 }))
    const calls = commands('lightning', { elapsed: 300, exclusions })
    expect(calls.filter(c => c[0] === 'clip')).toHaveLength(14)
    const clips = calls.filter(c => ['beginPath', 'rect', 'clip'].includes(c[0] as string))
    expect(clips.slice(0, 8)).toEqual([
      ['beginPath'], ['rect', 0, 0, 294, 294], ['rect', 0, 0, 30, 30], ['clip', 'evenodd'],
      ['beginPath'], ['rect', 0, 0, 294, 294], ['rect', 1, 1, 30, 30], ['clip', 'evenodd'],
    ])
  })
})
