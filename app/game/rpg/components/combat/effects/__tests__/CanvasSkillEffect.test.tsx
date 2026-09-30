import { StrictMode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasSkillEffect } from '../CanvasSkillEffect'
import { EFFECT_PROFILES } from '../effectRegistry'
import { getEffectTiming } from '../effectTimeline'
import { renderSkillEffect } from '../renderSkillEffect'
import type { EffectFrame } from '../effectDrawing'
import type { EffectAnchors, SkillEffectProps } from '../types'

// Keep these tests about the clock, lifecycle, and drawing inputs. Pixel
// appearance needs a real canvas rather than a jsdom rendering approximation.
vi.mock('../renderSkillEffect', () => ({ renderSkillEffect: vi.fn() }))

const draw = vi.mocked(renderSkillEffect)
const normalTiming = getEffectTiming(EFFECT_PROFILES.fireball)
const baseProps: SkillEffectProps = { type: 'fireball', active: true }

class MotionPreference extends EventTarget {
  matches = false
  readonly media = '(prefers-reduced-motion: reduce)'

  setReducedMotion(matches: boolean) {
    this.matches = matches
    this.dispatchEvent(new Event('change'))
  }
}

class TestResizeObserver {
  static instances: TestResizeObserver[] = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this)
  }

  resize() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

describe('CanvasSkillEffect lifecycle', () => {
  let frames: Map<number, FrameRequestCallback>
  let nextFrameId: number
  let motion: MotionPreference
  let size: { width: number; height: number }
  let context: Pick<CanvasRenderingContext2D, 'setTransform' | 'clearRect'>

  function frameAt(now: number) {
    act(() => {
      const pending = [...frames.values()]
      frames.clear()
      for (const frame of pending) frame(now)
    })
  }

  function lastDraw(): EffectFrame {
    const last = draw.mock.calls.at(-1)
    expect(last).toBeDefined()
    return last![0]
  }

  function advanceTimers(ms: number) {
    act(() => { vi.advanceTimersByTime(ms) })
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    draw.mockClear()
    frames = new Map()
    nextFrameId = 1
    motion = new MotionPreference()
    size = { width: 640, height: 420 }
    context = { setTransform: vi.fn(), clearRect: vi.fn() }
    TestResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', TestResizeObserver)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId++
      frames.set(id, callback)
      return id
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { frames.delete(id) }))
    vi.spyOn(window, 'matchMedia').mockReturnValue(motion as unknown as MediaQueryList)
    vi.spyOn(motion, 'addEventListener')
    vi.spyOn(motion, 'removeEventListener')
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(1)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      ...size, x: 0, y: 0, top: 0, left: 0,
      right: size.width, bottom: size.height, toJSON: () => ({}),
    }))
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('allocates no canvas, animation, or observer while inactive', () => {
    const { container } = render(<CanvasSkillEffect {...baseProps} active={false} />)
    expect(container.querySelector('canvas')).toBeNull()
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(TestResizeObserver.instances).toHaveLength(0)
    expect(draw).not.toHaveBeenCalled()
  })

  it('starts once and hits/completes once at the correct boundaries', () => {
    const order: string[] = []
    const onStart = vi.fn(() => { order.push('start') })
    const onHit = vi.fn(() => { order.push('hit') })
    const onComplete = vi.fn(() => { order.push('complete') })
    const { container } = render(<CanvasSkillEffect {...baseProps} onStart={onStart} onHit={onHit} onComplete={onComplete} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(onStart).not.toHaveBeenCalled()
    frameAt(100)
    expect(canvas).toHaveAttribute('data-phase', 'cast')
    frameAt(100 + normalTiming.hitMs - 1)
    expect(canvas).toHaveAttribute('data-phase', 'travel')
    expect(onHit).not.toHaveBeenCalled()
    frameAt(100 + normalTiming.hitMs)
    expect(canvas).toHaveAttribute('data-phase', 'impact')
    frameAt(100 + normalTiming.hitMs + 1)
    expect(onHit).toHaveBeenCalledTimes(1)
    frameAt(100 + normalTiming.durationMs)
    expect(canvas).toHaveAttribute('data-phase', 'complete')
    expect(frames.size).toBe(0)
    advanceTimers(10_000)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['start', 'hit', 'complete'])
  })

  it('settles hit before completion after RAF skips beyond the entire cast', () => {
    const order: string[] = []
    render(<CanvasSkillEffect {...baseProps} onHit={() => order.push('hit')} onComplete={() => order.push('complete')} />)
    frameAt(100)
    frameAt(60_100)
    expect(order).toEqual(['hit', 'complete'])
    expect(frames.size).toBe(0)
    advanceTimers(10_000)
    expect(order).toEqual(['hit', 'complete'])
  })

  it.each([false, true])('settles via watchdog when RAF stops (first frame rendered: %s)', started => {
    const onHit = vi.fn()
    const onComplete = vi.fn()
    const { container } = render(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    if (started) frameAt(0)
    advanceTimers(normalTiming.durationMs + 179)
    expect(onComplete).not.toHaveBeenCalled()
    advanceTimers(1)
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(container.querySelector('canvas')).toHaveAttribute('data-phase', 'complete')
    expect(frames.size).toBe(0)
    frameAt(60_000)
    advanceTimers(60_000)
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('restarts for a new seed and cancels the previous cast (already hit: %s)', alreadyHit => {
    const firstHit = vi.fn()
    const firstComplete = vi.fn()
    const nextHit = vi.fn()
    const nextComplete = vi.fn()
    const onStart = vi.fn()
    const { rerender } = render(<CanvasSkillEffect {...baseProps} seed={11} onStart={onStart} onHit={firstHit} onComplete={firstComplete} />)
    frameAt(100)
    expect(lastDraw().seed).toBe(11)
    frameAt(alreadyHit ? 100 + normalTiming.hitMs : 200)
    rerender(<CanvasSkillEffect {...baseProps} seed={22} onStart={onStart} onHit={nextHit} onComplete={nextComplete} />)
    expect(TestResizeObserver.instances[0].disconnect).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
    frameAt(300)
    expect(lastDraw()).toMatchObject({ seed: 22, elapsed: 0 })
    frameAt(300 + normalTiming.durationMs)
    advanceTimers(10_000)
    expect(onStart).toHaveBeenCalledTimes(2)
    expect(firstHit).toHaveBeenCalledTimes(alreadyHit ? 1 : 0)
    expect(firstComplete).not.toHaveBeenCalled()
    expect(nextHit).toHaveBeenCalledTimes(1)
    expect(nextComplete).toHaveBeenCalledTimes(1)
  })

  it('allows identical consecutive spells with a new React cast key', () => {
    const onHit = vi.fn()
    const onComplete = vi.fn()
    const { rerender } = render(<CanvasSkillEffect key="round-1" {...baseProps} seed={11} onHit={onHit} onComplete={onComplete} />)
    frameAt(0)
    frameAt(normalTiming.durationMs)
    rerender(<CanvasSkillEffect key="round-2" {...baseProps} seed={11} onHit={onHit} onComplete={onComplete} />)
    frameAt(2000)
    expect(lastDraw().elapsed).toBe(0)
    frameAt(2000 + normalTiming.durationMs)
    expect(onHit).toHaveBeenCalledTimes(2)
    expect(onComplete).toHaveBeenCalledTimes(2)
  })

  it.each(['unmount', 'deactivate'] as const)('cancels pending callbacks and removes resources on %s', cancel => {
    const onHit = vi.fn()
    const onComplete = vi.fn()
    const view = render(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    frameAt(100)
    const queuedFrame = [...frames.values()][0]
    if (cancel === 'unmount') view.unmount()
    else view.rerender(<CanvasSkillEffect {...baseProps} active={false} onHit={onHit} onComplete={onComplete} />)
    expect(view.container.querySelector('canvas')).toBeNull()
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(TestResizeObserver.instances[0].disconnect).toHaveBeenCalledTimes(1)
    expect(motion.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, size.width, size.height)
    const drawCount = draw.mock.calls.length
    act(() => {
      queuedFrame(60_000)
      motion.setReducedMotion(true)
    })
    advanceTimers(60_000)
    expect(draw).toHaveBeenCalledTimes(drawCount)
    expect(onHit).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('cancels completion when the hit callback unmounts the effect', () => {
    const onComplete = vi.fn()
    const onHit = vi.fn(() => view.unmount())
    const view = render(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    frameAt(0)
    frameAt(normalTiming.durationMs)
    advanceTimers(10_000)
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
    expect(frames.size).toBe(0)
  })

  it('reactivates a stopped effect as a fresh cast', () => {
    const onHit = vi.fn()
    const onComplete = vi.fn()
    const { rerender } = render(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    frameAt(0)
    rerender(<CanvasSkillEffect {...baseProps} active={false} onHit={onHit} onComplete={onComplete} />)
    rerender(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    frameAt(1000)
    expect(lastDraw().elapsed).toBe(0)
    frameAt(1000 + normalTiming.durationMs)
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('uses the latest callbacks without restarting an existing cast', () => {
    const oldStart = vi.fn()
    const oldHit = vi.fn()
    const oldComplete = vi.fn()
    const nextStart = vi.fn()
    const nextHit = vi.fn()
    const nextComplete = vi.fn()
    const { rerender } = render(<CanvasSkillEffect {...baseProps} onStart={oldStart} onHit={oldHit} onComplete={oldComplete} />)
    rerender(<CanvasSkillEffect {...baseProps} onStart={nextStart} onHit={nextHit} onComplete={nextComplete} />)
    frameAt(0)
    expect(nextStart).toHaveBeenCalledTimes(1)
    expect(oldStart).not.toHaveBeenCalled()
    expect(TestResizeObserver.instances).toHaveLength(1)
    frameAt(normalTiming.durationMs)
    expect(nextHit).toHaveBeenCalledTimes(1)
    expect(nextComplete).toHaveBeenCalledTimes(1)
    expect(oldHit).not.toHaveBeenCalled()
    expect(oldComplete).not.toHaveBeenCalled()
  })

  it('picks up a callback replacement after the clock has already started', () => {
    const onStart = vi.fn()
    const oldHit = vi.fn()
    const oldComplete = vi.fn()
    const nextHit = vi.fn()
    const nextComplete = vi.fn()
    const { rerender } = render(<CanvasSkillEffect {...baseProps} onStart={onStart} onHit={oldHit} onComplete={oldComplete} />)
    frameAt(100)
    frameAt(300)
    rerender(<CanvasSkillEffect {...baseProps} onStart={onStart} onHit={nextHit} onComplete={nextComplete} />)
    frameAt(100 + normalTiming.hitMs)
    expect(lastDraw().elapsed).toBe(normalTiming.hitMs)
    expect(nextHit).toHaveBeenCalledTimes(1)
    frameAt(100 + normalTiming.durationMs)
    expect(nextComplete).toHaveBeenCalledTimes(1)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(oldHit).not.toHaveBeenCalled()
    expect(oldComplete).not.toHaveBeenCalled()
    expect(TestResizeObserver.instances).toHaveLength(1)
  })

  it('uses the reduced-motion timeline from the first frame', () => {
    motion.matches = true
    const onHit = vi.fn()
    const onComplete = vi.fn()
    render(<CanvasSkillEffect {...baseProps} duration={2400} onHit={onHit} onComplete={onComplete} />)
    frameAt(100)
    expect(lastDraw()).toMatchObject({ reducedMotion: true, timing: { castMs: 60, hitMs: 90, durationMs: 280 } })
    frameAt(189)
    expect(onHit).not.toHaveBeenCalled()
    frameAt(190)
    expect(onHit).toHaveBeenCalledTimes(1)
    frameAt(380)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
  })

  it.each([false, true])('settles once when reduced motion is enabled mid-cast (already hit: %s)', alreadyHit => {
    const onHit = vi.fn()
    const onComplete = vi.fn()
    const { container } = render(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    frameAt(0)
    if (alreadyHit) frameAt(normalTiming.hitMs)
    act(() => { motion.setReducedMotion(true) })
    expect(lastDraw().reducedMotion).toBe(true)
    expect(container.querySelector('canvas')).toHaveAttribute('data-phase', 'complete')
    expect(frames.size).toBe(0)
    act(() => {
      motion.setReducedMotion(false)
      motion.setReducedMotion(true)
    })
    advanceTimers(10_000)
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not lengthen or restart a reduced-motion cast when the preference is disabled', () => {
    motion.matches = true
    const onStart = vi.fn()
    const onComplete = vi.fn()
    render(<CanvasSkillEffect {...baseProps} onStart={onStart} onComplete={onComplete} />)
    frameAt(0)
    act(() => { motion.setReducedMotion(false) })
    frameAt(280)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
  })

  it('uses current measured anchors on resize without restarting the clock', () => {
    let measured: EffectAnchors = { source: { x: 0.2, y: 0.8 }, targets: [{ x: 0.7, y: 0.25 }] }
    const resolveAnchors = vi.fn(() => measured)
    render(<CanvasSkillEffect {...baseProps} resolveAnchors={resolveAnchors} />)
    frameAt(100)
    expect(lastDraw()).toMatchObject({ source: { x: 128, y: 336 }, targets: [{ x: 448, y: 105 }] })
    size = { width: 800, height: 500 }
    measured = { source: { x: 0.25, y: 0.9 }, targets: [{ x: 0.4, y: 0.2 }, { x: 0.8, y: 0.3 }] }
    act(() => { TestResizeObserver.instances[0].resize() })
    frameAt(300)
    expect(lastDraw()).toMatchObject({
      width: 800, height: 500, elapsed: 200,
      source: { x: 200, y: 450 }, targets: [{ x: 320, y: 100 }, { x: 640, y: 150 }],
    })
    expect(TestResizeObserver.instances).toHaveLength(1)
  })

  it('reads replacement anchor props on the next resize and sanitizes all points', () => {
    const { rerender } = render(<CanvasSkillEffect {...baseProps} sourcePosition={{ x: 0.1, y: 0.1 }} />)
    frameAt(0)
    rerender(<CanvasSkillEffect {...baseProps} sourcePosition={{ x: -1, y: Infinity }} targetPositions={[
      { x: NaN, y: -1 }, { x: 2, y: 2 }, { x: 0, y: 0 },
      { x: 0.25, y: 0.5 }, { x: 0.5, y: 0.75 }, { x: 0.75, y: 1 },
    ]} />)
    act(() => { TestResizeObserver.instances[0].resize() })
    frameAt(200)
    expect(lastDraw()).toMatchObject({
      elapsed: 200, source: { x: 0, y: 105 },
      targets: [{ x: 320, y: 0 }, { x: 640, y: 420 }, { x: 0, y: 0 }, { x: 160, y: 210 }, { x: 320, y: 315 }],
    })
  })

  it('uses a replacement anchor resolver on subsequent resizes', () => {
    const firstResolver = vi.fn(() => ({ source: { x: 0.1, y: 0.9 }, targets: [{ x: 0.2, y: 0.1 }] }))
    const nextResolver = vi.fn(() => ({ source: { x: 0.4, y: 0.8 }, targets: [{ x: 0.75, y: 0.5 }] }))
    const { rerender } = render(<CanvasSkillEffect {...baseProps} resolveAnchors={firstResolver} />)
    frameAt(0)
    firstResolver.mockClear()
    rerender(<CanvasSkillEffect {...baseProps} resolveAnchors={nextResolver} />)
    act(() => { TestResizeObserver.instances[0].resize() })
    frameAt(200)
    expect(firstResolver).not.toHaveBeenCalled()
    expect(nextResolver).toHaveBeenCalledTimes(1)
    expect(lastDraw()).toMatchObject({ elapsed: 200, source: { x: 256, y: 336 }, targets: [{ x: 480, y: 210 }] })
  })

  it('maps current exclusion rectangles to CSS pixels again after a resize', () => {
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2)
    let measured: EffectAnchors = {
      source: { x: 0.5, y: 0.85 }, targets: [{ x: 0.5, y: 0.25 }],
      exclusions: [{ x: 0.25, y: 0.1, width: 0.5, height: 0.2 }],
    }
    render(<CanvasSkillEffect {...baseProps} resolveAnchors={() => measured} />)
    frameAt(100)
    expect(lastDraw().exclusions).toEqual([{ x: 160, y: 42, width: 320, height: 84 }])
    size = { width: 800, height: 500 }
    measured = { ...measured, exclusions: [{ x: 0.1, y: 0.8, width: 0.4, height: 0.1 }] }
    act(() => { TestResizeObserver.instances[0].resize() })
    frameAt(300)
    expect(lastDraw()).toMatchObject({
      elapsed: 200, exclusions: [{ x: 80, y: 400, width: 320, height: 50 }],
    })
    measured = { source: measured.source, targets: measured.targets }
    act(() => { TestResizeObserver.instances[0].resize() })
    frameAt(400)
    expect(lastDraw().exclusions ?? []).toEqual([])
  })

  it('limits exclusion processing to fourteen rectangles without mutating measured anchors', () => {
    const exclusions = Array.from({ length: 16 }, (_, index) => ({ x: index / 20, y: 0.1, width: 0.05, height: 0.1 }))
    const original = structuredClone(exclusions)
    render(<CanvasSkillEffect {...baseProps} resolveAnchors={() => ({
      source: { x: 0.5, y: 0.85 }, targets: [{ x: 0.5, y: 0.25 }], exclusions,
    })} />)
    frameAt(0)
    expect(lastDraw().exclusions).toEqual(original.slice(0, 14).map(rect => ({
      x: rect.x * size.width, y: rect.y * size.height,
      width: rect.width * size.width, height: rect.height * size.height,
    })))
    expect(exclusions).toEqual(original)
  })

  it('falls back to the target prop when measured targets are empty', () => {
    render(<CanvasSkillEffect {...baseProps} targetPosition={{ x: 0.3, y: 0.4 }} resolveAnchors={() => ({ source: { x: 0.1, y: 0.9 }, targets: [] })} />)
    frameAt(0)
    expect(lastDraw()).toMatchObject({ source: { x: 64, y: 378 }, targets: [{ x: 192, y: 168 }] })
  })

  it('caps device pixel ratio at two while retaining CSS-pixel drawing coordinates', () => {
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3)
    const { container } = render(<CanvasSkillEffect {...baseProps} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.width).toBe(1280)
    expect(canvas.height).toBe(840)
    expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0)
    frameAt(0)
    expect(lastDraw()).toMatchObject({ width: 640, height: 420, source: { x: 320, y: 357 } })
  })

  it.each([{ width: 1920, height: 1080 }, { width: 1440, height: 900 }])('never exceeds two million backing pixels for a $width×$height canvas', bounds => {
    size = bounds
    vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3)
    const { container } = render(<CanvasSkillEffect {...baseProps} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(2_000_000)
  })

  it('settles a hidden zero-size canvas without issuing invalid drawing operations', () => {
    size = { width: 0, height: 0 }
    const onHit = vi.fn()
    const onComplete = vi.fn()
    render(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    frameAt(0)
    frameAt(normalTiming.durationMs)
    expect(context.setTransform).not.toHaveBeenCalled()
    expect(draw).not.toHaveBeenCalled()
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('resumes drawing when a zero-size battlefield becomes visible without restarting time', () => {
    size = { width: 0, height: 0 }
    const onStart = vi.fn()
    render(<CanvasSkillEffect {...baseProps} onStart={onStart} />)
    frameAt(100)
    expect(draw).not.toHaveBeenCalled()
    size = { width: 640, height: 420 }
    act(() => { TestResizeObserver.instances[0].resize() })
    frameAt(300)
    expect(lastDraw()).toMatchObject({ width: 640, height: 420, elapsed: 200 })
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('settles once without a canvas context', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const onHit = vi.fn()
    const onComplete = vi.fn()
    render(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    await act(async () => { await Promise.resolve() })
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(draw).not.toHaveBeenCalled()
  })

  it('cancels the no-context fallback when unmounted before its microtask', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const onHit = vi.fn()
    const onComplete = vi.fn()
    const { unmount } = render(<CanvasSkillEffect {...baseProps} onHit={onHit} onComplete={onComplete} />)
    unmount()
    await act(async () => { await Promise.resolve() })
    expect(onHit).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('does not duplicate a cast under StrictMode effect replay', () => {
    const onStart = vi.fn()
    const onHit = vi.fn()
    const onComplete = vi.fn()
    render(<StrictMode><CanvasSkillEffect {...baseProps} onStart={onStart} onHit={onHit} onComplete={onComplete} /></StrictMode>)
    expect(frames.size).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
    frameAt(0)
    frameAt(normalTiming.durationMs)
    advanceTimers(10_000)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onHit).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
  it('maps a measured familiar anchor to the canvas and refreshes it on resize', () => {
    const resolveAnchors = () => ({ source: { x: 0.5, y: 0.85 }, companion: { x: 0.3, y: 0.85 }, targets: [{ x: 0.5, y: 0.25 }] })
    render(<CanvasSkillEffect {...baseProps} type="charm-light" resolveAnchors={resolveAnchors} />)
    frameAt(0)
    expect(lastDraw().companion).toEqual({ x: 192, y: 357 })
    size = { width: 320, height: 320 }
    act(() => TestResizeObserver.instances[0].resize())
    frameAt(100)
    expect(lastDraw().companion).toEqual({ x: 96, y: 272 })
  })

})
