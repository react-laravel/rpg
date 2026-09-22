'use client'

import { useGameStore } from '../../stores/gameStore'

export function CombatRegenSettings() {
  const { character } = useGameStore()

  const vitality = character?.vitality ?? 0
  const energy = character?.energy ?? 0
  const hpPerTick = Math.max(0, Math.round(vitality * 0.25))
  const mpPerTick = Math.max(0, Math.round(energy * 0.5))

  return (
    <div className="bg-card border-border rounded-lg border p-3 sm:p-4">
      <div className="mb-3 sm:mb-4">
        <h4 className="text-foreground text-base font-medium sm:text-lg">战斗恢复</h4>
        <p className="text-muted-foreground mt-1 text-xs">
          战斗中每隔数秒根据体力与能量自动恢复 HP/MP。
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="bg-muted/50 border-border rounded-lg border p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-foreground text-sm font-medium">生命恢复</span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              +{hpPerTick} HP
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            当前体力 {vitality}。每 4 点体力，每拍大约多恢复 1 点生命。
          </p>
        </div>

        <div className="bg-muted/50 border-border rounded-lg border p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-foreground text-sm font-medium">法力恢复</span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              +{mpPerTick} MP
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            当前能量 {energy}。每 2 点能量，每拍多恢复 1 点法力。
          </p>
        </div>
      </div>
    </div>
  )
}
