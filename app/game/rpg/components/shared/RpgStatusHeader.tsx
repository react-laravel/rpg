'use client'

import { useShallow } from 'zustand/react/shallow'
import { Droplets, Heart } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { CLASS_NAMES } from '../../types'
import { getLevelProgress } from '../../utils/experience'
import { CopperDisplay } from './CopperDisplay'

/** Subscribe separately so resource updates do not redraw the game shell. */
export function RpgStatusHeader() {
  const { character, combatStats, currentHp, currentMana, experienceTable } = useGameStore(
    useShallow(s => ({
      character: s.character,
      combatStats: s.combatStats,
      currentHp: s.currentHp,
      currentMana: s.currentMana,
      experienceTable: s.experienceTable,
    }))
  )
  if (!character) return null

  const progress = getLevelProgress(character.level, character.experience, experienceTable)
  const resources = [
    {
      label: '生命',
      value: currentHp ?? character.current_hp ?? combatStats?.max_hp,
      max: combatStats?.max_hp,
      icon: Heart,
      color: 'text-rose-600 dark:text-rose-400',
      fill: 'bg-rose-500',
    },
    {
      label: '法力',
      value: currentMana ?? character.current_mana ?? combatStats?.max_mana,
      max: combatStats?.max_mana,
      icon: Droplets,
      color: 'text-blue-600 dark:text-blue-400',
      fill: 'bg-blue-500',
    },
  ]

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,1fr)_minmax(16rem,1.5fr)_auto] sm:gap-x-6">
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
      <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:gap-5">
        {resources.map(resource => {
          const percent =
            resource.max && resource.value != null
              ? Math.max(0, Math.min(100, (resource.value / resource.max) * 100))
              : 0
          return (
            <div
              key={resource.label}
              className="min-w-0 flex-1"
              title={`${resource.label} ${resource.value ?? '—'} / ${resource.max ?? '—'}`}
            >
              <div
                className={`mb-1 flex items-center gap-1 text-[11px] tabular-nums sm:text-xs ${resource.color}`}
              >
                <resource.icon aria-hidden="true" className="h-3 w-3 shrink-0" />
                <span>{resource.label}</span>
                <span className="ml-auto font-medium">{resource.value ?? '—'}</span>
                <span className="text-muted-foreground hidden sm:inline">
                  / {resource.max ?? '—'}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={resource.label}
                aria-valuemin={0}
                aria-valuemax={resource.max ?? 0}
                aria-valuenow={
                  resource.value == null
                    ? undefined
                    : Math.max(0, Math.min(resource.max ?? resource.value, resource.value))
                }
                className="bg-muted h-1 overflow-hidden rounded-full"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${resource.fill}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
        <span
          className="text-muted-foreground shrink-0 text-[10px] tabular-nums sm:hidden"
          title={progress ? `本级经验 ${progress.earned} / ${progress.required}` : '经验数据加载中'}
        >
          EXP {progress ? `${progress.percent.toFixed(1)}%` : '—'}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="升级经验"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress?.percent}
        aria-valuetext={progress ? `${progress.earned} / ${progress.required}` : '加载中'}
        className="bg-muted absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
        title={progress ? `本级经验 ${progress.earned} / ${progress.required}` : '经验数据加载中'}
      >
        <div
          className="bg-amber-500 h-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress?.percent ?? 0}%` }}
        />
      </div>
    </div>
  )
}
