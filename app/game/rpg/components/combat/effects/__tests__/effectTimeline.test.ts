import { describe, expect, it, vi } from 'vitest'
import { EFFECT_PROFILES } from '../effectRegistry'
import { createEffectTimeline, getEffectTiming } from '../effectTimeline'

describe('getEffectTiming', () => {
  it.each(Object.entries(EFFECT_PROFILES))('preserves the %s profile timing by default', (_type, profile) => {
    const timing = getEffectTiming(profile)
    expect(timing).toEqual({
      castMs: Math.min(180, profile.hitMs * 0.45),
      hitMs: profile.hitMs,
      durationMs: profile.durationMs,
    })
    expect(timing.castMs).toBeLessThan(timing.hitMs)
    expect(timing.hitMs).toBeLessThan(timing.durationMs)
  })

  it.each([
    [-1, 300], [0, 300], [299, 300], [750, 750], [2401, 2400],
  ])('clamps requested duration %s to %s while keeping relative impact time', (requested, expected) => {
    const profile = EFFECT_PROFILES.fireball
    const timing = getEffectTiming(profile, requested)
    expect(timing.durationMs).toBe(expected)
    expect(timing.hitMs).toBeCloseTo(profile.hitMs * expected / profile.durationMs)
    expect(timing.castMs).toBeCloseTo(Math.min(180, timing.hitMs * 0.45))
  })

  it.each([undefined, NaN, Infinity, -Infinity])('uses the profile for non-finite duration %s', duration => {
    expect(getEffectTiming(EFFECT_PROFILES.meteor, duration)).toEqual(getEffectTiming(EFFECT_PROFILES.meteor))
  })

  it.each(Object.entries(EFFECT_PROFILES))('uses the short reduced-motion timeline for %s', (_type, profile) => {
    expect(getEffectTiming(profile, 2400, true)).toEqual({ castMs: 60, hitMs: 90, durationMs: 280 })
  })
})

describe('createEffectTimeline', () => {
  const timing = { castMs: 100, hitMs: 400, durationMs: 1000 }

  it('advances through exact phase boundaries and settles callbacks once in order', () => {
    const events: string[] = []
    const onHit = vi.fn(() => { events.push('hit') })
    const onComplete = vi.fn(() => { events.push('complete') })
    const timeline = createEffectTimeline(timing, onHit, onComplete)

    expect(timeline.advance(0)).toBe('cast')
    expect(timeline.advance(99)).toBe('cast')
    expect(timeline.advance(100)).toBe('travel')
    expect(timeline.advance(399)).toBe('travel')
    expect(onHit).not.toHaveBeenCalled()
    expect(timeline.advance(400)).toBe('impact')
    expect(timeline.advance(400)).toBe('impact')
    expect(timeline.advance(559)).toBe('impact')
    expect(timeline.advance(560)).toBe('tail')
    expect(timeline.advance(999)).toBe('tail')
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
    expect(timeline.advance(1000)).toBe('complete')
    expect(timeline.advance(1001)).toBe('complete')
    expect(timeline.advance(0)).toBe('complete')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(events).toEqual(['hit', 'complete'])
  })

  it('settles hit before completion when a suspended tab skips the entire animation', () => {
    const events: string[] = []
    const timeline = createEffectTimeline(timing, () => events.push('hit'), () => events.push('complete'))
    expect(timeline.advance(60_000)).toBe('complete')
    timeline.advance(120_000)
    expect(events).toEqual(['hit', 'complete'])
  })

  it('cancels before impact without emitting callbacks on any later frame', () => {
    const onHit = vi.fn()
    const onComplete = vi.fn()
    const timeline = createEffectTimeline(timing, onHit, onComplete)
    timeline.advance(200)
    timeline.cancel()
    timeline.cancel()
    expect(timeline.advance(1000)).toBe('complete')
    expect(onHit).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('does not complete a cast canceled by its own hit callback', () => {
    const onComplete = vi.fn()
    const onHit = vi.fn(() => timeline.cancel())
    const timeline = createEffectTimeline(timing, onHit, onComplete)
    expect(timeline.advance(1000)).toBe('complete')
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('does not complete twice when the hit callback synchronously advances to the end', () => {
    const onComplete = vi.fn()
    const onHit = vi.fn(() => timeline.advance(timing.durationMs))
    const timeline = createEffectTimeline(timing, onHit, onComplete)
    expect(timeline.advance(timing.durationMs)).toBe('complete')
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not re-enter completion from the completion callback', () => {
    const onHit = vi.fn()
    const onComplete = vi.fn(() => timeline.advance(timing.durationMs))
    const timeline = createEffectTimeline(timing, onHit, onComplete)
    expect(timeline.advance(timing.durationMs)).toBe('complete')
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('keeps independent casts from sharing cancellation or callback state', () => {
    const firstHit = vi.fn()
    const firstComplete = vi.fn()
    const nextHit = vi.fn()
    const nextComplete = vi.fn()
    const first = createEffectTimeline(timing, firstHit, firstComplete)
    const next = createEffectTimeline(timing, nextHit, nextComplete)
    first.advance(timing.hitMs)
    first.cancel()
    first.advance(timing.durationMs)
    next.advance(timing.durationMs)
    expect(firstHit).toHaveBeenCalledTimes(1)
    expect(firstComplete).not.toHaveBeenCalled()
    expect(nextHit).toHaveBeenCalledTimes(1)
    expect(nextComplete).toHaveBeenCalledTimes(1)
  })
})
