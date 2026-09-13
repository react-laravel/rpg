'use client'

import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../../stores/gameStore'
import { CLASS_NAMES } from '../../types'
import { CircularProgress } from './CircularProgress'
import { CopperDisplay } from './CopperDisplay'

/** 顶部状态栏：独立订阅 HP/MP，避免战斗推送触发整页重渲染 */
export function RpgStatusHeader() {
  const { character, combatStats, currentHp, currentMana } = useGameStore(
    useShallow(s => ({
      character: s.character,
      combatStats: s.combatStats,
      currentHp: s.currentHp,
      currentMana: s.currentMana,
    }))
  )
  if (!character) return null

  const hpValue = currentHp ?? character.current_hp ?? combatStats?.max_hp
  const mpValue = currentMana ?? character.current_mana ?? combatStats?.max_mana
  const hpMax = combatStats?.max_hp
  const mpMax = combatStats?.max_mana
  const hpPercent =
    hpMax && hpValue != null ? Math.max(0, Math.min(100, (hpValue / hpMax) * 100)) : 0
  const mpPercent =
    mpMax && mpValue != null ? Math.max(0, Math.min(100, (mpValue / mpMax) * 100)) : 0

  const resources = [
    {
      key: 'hp' as const,
      label: '生命',
      value: hpValue,
      max: hpMax,
      percent: hpPercent,
      color: 'red' as const,
      text: 'text-rose-500 dark:text-rose-400',
    },
    {
      key: 'mp' as const,
      label: '法力',
      value: mpValue,
      max: mpMax,
      percent: mpPercent,
      color: 'blue' as const,
      text: 'text-sky-500 dark:text-sky-400',
    },
  ]

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(7rem,1fr)_auto_auto] sm:gap-x-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold" title={character.name}>
          {character.name}
        </span>
        <span className="text-muted-foreground hidden shrink-0 text-xs lg:inline">
          {CLASS_NAMES[character.class]}
        </span>
        <span className="bg-primary/12 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums">
          Lv.{character.level}
        </span>
      </div>

      <div
        className="col-start-2 row-start-1 text-right sm:col-start-3"
        aria-label={`持有 ${character.copper} 铜币`}
      >
        <CopperDisplay copper={character.copper} size="sm" maxParts={3} nowrap />
      </div>

      <div className="col-span-2 flex min-w-0 items-center justify-center gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:gap-5">
        {resources.map(resource => (
          <div
            key={resource.key}
            className="flex items-center gap-1.5"
            title={`${resource.label} ${resource.value ?? '—'} / ${resource.max ?? '—'}`}
          >
            <CircularProgress
              percent={resource.percent}
              color={resource.color}
              size="md"
              label={resource.label}
            />
            <div className={`min-w-0 ${resource.text}`}>
              <div className="text-[10px] leading-none font-medium tracking-wide sm:text-[11px]">
                {resource.label}
              </div>
              <div className="mt-0.5 text-sm leading-none font-semibold tabular-nums sm:text-base">
                {resource.value ?? '—'}
                <span className="text-muted-foreground ml-0.5 hidden text-[10px] font-normal sm:inline">
                  / {resource.max ?? '—'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
