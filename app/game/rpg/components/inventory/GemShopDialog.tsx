'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { useGameStore } from '../../stores/gameStore'
import { STAT_NAMES } from '../../types'
import { formatCopper } from '../../types/constants'
import { formatItemStatValue } from '../../utils/itemUtils'
import { CopperDisplay } from '../shared/CopperDisplay'

export interface GemOffer {
  id: number
  name: string
  icon?: string | null
  required_level: number
  gem_stats: Record<string, number>
  buy_price: number
}

export function GemShopDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const copper = useGameStore(state => state.character?.copper ?? 0)
  const level = useGameStore(state => state.character?.level ?? 1)
  const buyGem = useGameStore(state => state.buyGem)
  const isLoading = useGameStore(state => state.isLoading)
  const [gems, setGems] = useState<GemOffer[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    apiGet<{ gems: GemOffer[] }>('/rpg/gems/shop')
      .then(response => {
        if (!cancelled) setGems(response.gems ?? [])
      })
      .catch(reason => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '宝石列表加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border-border flex max-h-[min(32rem,calc(100dvh-2rem))] w-full max-w-sm flex-col rounded-lg border">
        <div className="border-border flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <h4 className="text-foreground text-base font-bold">买宝石</h4>
            <p className="text-muted-foreground mt-0.5 text-xs">孔位跟着装备掉落。铜币在这里买宝石。</p>
          </div>
          <CopperDisplay copper={copper} size="sm" />
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {error && <p className="text-destructive text-sm">{error}</p>}
          {gems.map(gem => {
            const locked = level < gem.required_level
            const short = copper < gem.buy_price
            const stats = Object.entries(gem.gem_stats)
              .map(([stat, value]) => `+${formatItemStatValue(Number(value), stat)} ${STAT_NAMES[stat] || stat}`)
              .join('  ')

            return (
              <div key={gem.id} className="border-border flex items-center gap-2 rounded-md border px-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{gem.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {stats}
                    {locked ? ` · ${gem.required_level}级` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isLoading || locked || short}
                  className="bg-amber-600 hover:bg-amber-700 shrink-0 rounded px-2 py-1.5 text-xs text-white disabled:opacity-50"
                  onClick={() => void buyGem(gem.id)}
                >
                  买 {formatCopper(gem.buy_price)}
                </button>
              </div>
            )
          })}
        </div>
        <div className="border-border flex justify-end border-t px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-muted text-foreground hover:bg-secondary rounded px-3 py-2 text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
