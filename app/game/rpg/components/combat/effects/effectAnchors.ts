import type { EffectAnchors, EffectPoint } from './types'

const clamp = (value: number) => Math.max(0, Math.min(1, value))

export function readBattleEffectAnchors(
  arena: HTMLElement | null,
  targetSlots: readonly number[] | undefined,
  allTargets: boolean
): EffectAnchors {
  const fallback: EffectAnchors = { source: { x: 0.5, y: 0.85 }, targets: [{ x: 0.5, y: 0.25 }] }
  if (!arena) return fallback
  const bounds = arena.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return fallback
  const center = (element: Element): EffectPoint => {
    const rect = element.getBoundingClientRect()
    return { x: clamp((rect.left + rect.width / 2 - bounds.left) / bounds.width), y: clamp((rect.top + rect.height / 2 - bounds.top) / bounds.height) }
  }
  const caster = arena.querySelector('[data-effect-caster]')
  const elements = [...arena.querySelectorAll('[data-effect-target]')]
  const slots = [...new Set(targetSlots?.filter(slot => Number.isInteger(slot) && slot >= 0 && slot < 5))]
  const selected = allTargets
    ? elements
    : slots.length
      ? slots.flatMap(slot => elements.filter(el => Number(el.getAttribute('data-effect-target')) === slot))
      : elements.slice(0, 1)
  return { source: caster ? center(caster) : fallback.source, targets: selected.length ? selected.map(center) : fallback.targets }
}
