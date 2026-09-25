'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CopperDisplay } from '../shared/CopperDisplay'
import { ItemQuality, QUALITY_COLORS, QUALITY_NAMES } from '../../types'
import { INVENTORY_CATEGORIES, RECYCLE_QUALITIES } from './inventoryConfig'

interface QualityStat {
  count: number
  totalPrice: number
}

const TOOLBAR_ACTION_BTN_CLASS =
  'flex shrink-0 items-center justify-center whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors'

interface InventoryToolbarProps {
  categoryId: string
  isLoading: boolean
  onCategoryChange: (categoryId: string) => void
  onOpenGemShop: () => void
  onRecycleQuality: (quality: string) => void
  onSort: (sortType: 'default' | 'quality' | 'price', inStorage: boolean) => void
  qualityStats: Record<string, QualityStat>
  recyclingQuality: string | null
}

export function InventoryToolbar({
  categoryId,
  isLoading,
  onCategoryChange,
  onOpenGemShop,
  onRecycleQuality,
  onSort,
  qualityStats,
  recyclingQuality,
}: InventoryToolbarProps) {
  const [sortBy, setSortBy] = useState<'default' | 'quality' | 'price'>('default')
  const recycleAllStats = Object.values(qualityStats).reduce(
    (total, stats) => ({
      count: total.count + stats.count,
      totalPrice: total.totalPrice + stats.totalPrice,
    }),
    { count: 0, totalPrice: 0 }
  )
  const isRecycling = recyclingQuality != null

  const handleSort = (sortType: 'default' | 'quality' | 'price') => {
    setSortBy(sortType)
    onSort(sortType, false)
  }

  const sortOptions = [
    { value: 'default' as const, label: '时间' },
    { value: 'quality' as const, label: '品质' },
    { value: 'price' as const, label: '价格' },
  ]

  return (
    <div className="mb-3 flex shrink-0 flex-col gap-2 sm:mb-4 sm:gap-3">
      <div className="flex w-full min-w-0 items-stretch gap-2 sm:gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`${TOOLBAR_ACTION_BTN_CLASS} ${
                categoryId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              title="筛选"
            >
              <span>筛选</span>
              {categoryId && (
                <span className="ml-1 text-xs">
                  {INVENTORY_CATEGORIES.find(category => category.id === categoryId)?.emoji}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-2" align="end">
            <button
              type="button"
              onClick={() => onCategoryChange('')}
              className={`hover:bg-muted flex w-full items-center rounded px-2 py-1.5 text-left text-sm ${
                !categoryId ? 'bg-muted font-medium' : ''
              }`}
            >
              全部
            </button>
            {INVENTORY_CATEGORIES.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryChange(category.id)}
                className={`hover:bg-muted flex w-full items-center rounded px-2 py-1.5 text-left text-sm ${
                  categoryId === category.id ? 'bg-muted font-medium' : ''
                }`}
              >
                <span className="mr-2">{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <button
          type="button"
          className={`${TOOLBAR_ACTION_BTN_CLASS} bg-amber-600 text-white hover:bg-amber-700`}
          onClick={onOpenGemShop}
        >
          买宝石
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`${TOOLBAR_ACTION_BTN_CLASS} bg-muted text-muted-foreground hover:bg-muted/80`}
              title="回收"
            >
              <span>回收</span>
            </button>
          </PopoverTrigger>
            <PopoverContent className="w-56 space-y-1 p-2" align="end">
              <button
                type="button"
                onClick={() => onRecycleQuality('all')}
                disabled={isLoading || isRecycling || recycleAllStats.count === 0}
                className="bg-destructive/15 text-destructive hover:bg-destructive/20 flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>
                  全部回收
                  <span className="ml-1 text-xs opacity-70">×{recycleAllStats.count}</span>
                </span>
                <span className="flex items-center gap-1">
                  <CopperDisplay copper={recycleAllStats.totalPrice} size="xs" />
                  {recyclingQuality === 'all' && <span className="animate-spin">⏳</span>}
                </span>
              </button>
              {RECYCLE_QUALITIES.map(quality => {
                const stats = qualityStats[quality] || { count: 0, totalPrice: 0 }
                const isDisabled = stats.count === 0

                return (
                  <button
                    key={quality}
                    type="button"
                    onClick={() => onRecycleQuality(quality)}
                    disabled={isLoading || isRecycling || isDisabled}
                    className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      backgroundColor: `${QUALITY_COLORS[quality as ItemQuality]}${isDisabled ? '10' : '20'}`,
                      color: isDisabled
                        ? `${QUALITY_COLORS[quality as ItemQuality]}60`
                        : QUALITY_COLORS[quality as ItemQuality],
                    }}
                  >
                    <span>
                      {QUALITY_NAMES[quality as ItemQuality]}
                      <span className="ml-1 text-xs opacity-70">×{stats.count}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <CopperDisplay copper={stats.totalPrice} size="xs" />
                      {recyclingQuality === quality && <span className="animate-spin">⏳</span>}
                    </span>
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>

        <div
          className="bg-muted flex min-w-0 flex-1 basis-0 overflow-hidden rounded"
          role="group"
          aria-label="排序"
        >
          {sortOptions.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSort(option.value)}
              disabled={isLoading}
              className={`flex min-w-0 flex-1 basis-0 items-center justify-center px-1 py-1.5 text-xs whitespace-nowrap transition-colors disabled:opacity-50 sm:px-2 sm:text-sm ${
                sortBy === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/80'
              } ${index > 0 ? 'border-border/60 border-l' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
