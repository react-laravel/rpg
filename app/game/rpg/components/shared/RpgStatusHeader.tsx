'use client'

import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../../stores/gameStore'
import { CLASS_NAMES } from '../../types'
import { CircularProgress } from './CircularProgress'
import { CopperDisplay } from './CopperDisplay'

/** 顶部状态栏：单行展示名称/等级/双球/货币；球仅以色块液面表示状态 */
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

  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
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

      <div className="flex shrink-0 items-center gap-2" aria-label="生命与法力">
        <CircularProgress
          percent={hpPercent}
          color="red"
          size="md"
          label={`生命 ${hpValue ?? '—'} / ${hpMax ?? '—'}`}
        />
        <CircularProgress
          percent={mpPercent}
          color="blue"
          size="md"
          label={`法力 ${mpValue ?? '—'} / ${mpMax ?? '—'}`}
        />
      </div>

      <div
        className="flex shrink-0 items-center justify-end"
        aria-label={`持有 ${character.copper} 铜币`}
      >
        <CopperDisplay copper={character.copper} size="sm" maxParts={3} nowrap />
      </div>
    </div>
  )
}
