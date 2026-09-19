'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../../stores/gameStore'
import { computeFarmRates, formatEta } from '../../utils/farmStats'
import { getLevelProgress } from '../../utils/experience'
import interfaceStyles from '../../interface.module.css'

function formatRate(value: number): string {
  return value.toLocaleString('zh-CN', {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
    useGrouping: false,
  })
}

function RateValue({ value, copper = false }: { value: number | null; copper?: boolean }) {
  if (value == null) return <>统计中</>
  return (
    <span
      title={`${value.toLocaleString('zh-CN')}${copper ? ' 铜币' : ''}/分钟`}
      aria-label={`${value.toLocaleString('zh-CN')}${copper ? ' 铜币' : ''}/分钟`}
    >
      {formatRate(value)}
      <span className={interfaceStyles.farmStatUnit}>{copper ? '铜/分' : '/分'}</span>
    </span>
  )
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
    <dl
      className={interfaceStyles.farmStats}
      aria-label="当前地图收益速度"
    >
      <div>
        <dt>经验</dt>
        <dd><RateValue value={rates.expPerMin} /></dd>
      </div>
      <div>
        <dt>掉落</dt>
        <dd><RateValue value={rates.lootPerMin} copper /></dd>
      </div>
      <div>
        <dt>升级</dt>
        <dd title={eta ?? '统计中'}>{eta ?? '统计中'}</dd>
      </div>
      <div>
        <dt>伤害</dt>
        <dd><RateValue value={rates.damagePerMin} /></dd>
      </div>
      <div>
        <dt>击杀</dt>
        <dd><RateValue value={rates.killsPerMin} /></dd>
      </div>
      <div>
        <dt>承伤</dt>
        <dd><RateValue value={rates.takenPerMin} /></dd>
      </div>
    </dl>
  )
}
