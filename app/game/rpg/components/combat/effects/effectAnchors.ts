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
  const companion = arena.querySelector('[data-combat-unit-image="pet"]')
  const elements = [...arena.querySelectorAll('[data-effect-target]')]
  const slots = [...new Set(targetSlots?.filter(slot => Number.isInteger(slot) && slot >= 0 && slot < 5))]
  const selected = allTargets
    ? elements
    : slots.length
      ? slots.flatMap(slot => elements.filter(el => Number(el.getAttribute('data-effect-target')) === slot))
      : elements.slice(0, 1)
  // Seven units maximum (five enemies, caster and pet), with room for their captions.
  const exclusions = [...arena.querySelectorAll('[data-combat-resources], [data-monster-name]')].slice(0, 14).flatMap(element => {
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return []
    const x = clamp((rect.left - bounds.left - 2) / bounds.width)
    const y = clamp((rect.top - bounds.top - 2) / bounds.height)
    return [{ x, y, width: clamp((rect.right - bounds.left + 2) / bounds.width) - x, height: clamp((rect.bottom - bounds.top + 2) / bounds.height) - y }]
  })
  return { exclusions, companion: companion ? center(companion) : undefined, source: caster ? center(caster) : fallback.source, targets: selected.length ? selected.map(center) : fallback.targets }
}
