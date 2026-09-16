'use client'

import { winRateTone, type MapWinRateResult } from '../../utils/mapWinRate'

const TONE_CLASS = {
  good: 'bg-emerald-500/85 text-white',
  ok: 'bg-amber-400/90 text-black',
  bad: 'bg-red-500/90 text-white',
} as const

export function MapWinRateBadge({
  result,
  compact = false,
}: {
  result: MapWinRateResult | null
  compact?: boolean
}) {
  if (!result) return null
  const tone = winRateTone(result.percent)
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums sm:text-xs ${TONE_CLASS[tone]}`}
      title={`按当前攻击、生命、法力和技能估算。典型遭遇约 ${result.typicalPercent}%，五精英约 ${result.fiveElitePercent}%。`}
    >
      {compact ? `${result.percent}%` : `胜率 ${result.percent}%`}
    </span>
  )
}
