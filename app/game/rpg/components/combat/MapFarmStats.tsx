'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../../stores/gameStore'
import { computeFarmRates } from '../../utils/farmStats'
import { CopperDisplay } from '../shared/CopperDisplay'

function formatRate(value: number | null): string {
  if (value == null) return '统计中'
  return `${value.toLocaleString('zh-CN')}/分钟`
}

export function MapFarmStats() {
  const { farmSession, currentMap } = useGameStore(
    useShallow(s => ({
      farmSession: s.farmSession,
      currentMap: s.currentMap,
    }))
  )
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!farmSession) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [farmSession])

  if (!currentMap || !farmSession) return null

  const rates = computeFarmRates(farmSession, now)

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-md bg-black/45 px-2 py-1 text-[11px] leading-4 text-white/90 tabular-nums shadow-[0_1px_6px_rgb(0_0_0/0.45)] sm:text-xs"
      aria-label="当前地图收益速度"
    >
      <div>经验 {formatRate(rates.expPerMin)}</div>
      <div className="flex items-center gap-1">
        <span>掉落</span>
        {rates.lootPerMin == null ? (
          <span>统计中</span>
        ) : (
          <>
            <CopperDisplay copper={rates.lootPerMin} size="xs" nowrap />
            <span>/分钟</span>
          </>
        )}
      </div>
    </div>
  )
}
