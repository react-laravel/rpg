'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../../stores/gameStore'
import { computeFarmRates, formatEta } from '../../utils/farmStats'
import { getLevelProgress } from '../../utils/experience'
import { CopperDisplay } from '../shared/CopperDisplay'

function formatRate(value: number | null): string {
  if (value == null) return '统计中'
  return `${value.toLocaleString('zh-CN')}/分钟`
}

export function MapFarmStats() {
  const { farmSession, currentMap, character, experienceTable } = useGameStore(
    useShallow(s => ({
      farmSession: s.farmSession,
      currentMap: s.currentMap,
      character: s.character,
      experienceTable: s.experienceTable,
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
  const progress =
    character != null ? getLevelProgress(character.level, character.experience, experienceTable) : null
  const remaining = progress != null ? progress.required - progress.earned : 0
  const eta = formatEta(remaining, rates.expPerMin)

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 z-20 grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-md bg-black/45 px-2 py-1 text-[11px] leading-4 text-white/90 tabular-nums shadow-[0_1px_6px_rgb(0_0_0/0.45)] sm:text-xs"
      aria-label="当前地图收益速度"
    >
      <div>伤害 {formatRate(rates.damagePerMin)}</div>
      <div>承伤 {formatRate(rates.takenPerMin)}</div>
      <div>击杀 {formatRate(rates.killsPerMin)}</div>
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
      <div>经验 {formatRate(rates.expPerMin)}</div>
      <div>升级 {eta ?? '统计中'}</div>
    </div>
  )
}
