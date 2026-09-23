'use client'

import { useMemo, useState } from 'react'
import type { GameItem } from '../../types'
import {
  type InventorySlotCell,
  buildSlotArray,
  computeQualityStats,
  filterSlotsByCategory,
  getCategoryById,
  toSlotCells,
} from './inventoryUtils'

interface UseInventoryPanelViewParams {
  inventory: GameItem[]
  inventorySize: number
  sellItemsByQuality: (quality: string) => Promise<unknown>
}

export function useInventoryPanelView({
  inventory,
  inventorySize,
  sellItemsByQuality,
}: UseInventoryPanelViewParams) {
  const [categoryId, setCategoryId] = useState('')
  const [recyclingQuality, setRecyclingQuality] = useState<string | null>(null)

  const qualityStats = useMemo(() => computeQualityStats(inventory), [inventory])
  const inventorySlots = useMemo(
    () => buildSlotArray(inventory, inventorySize),
    [inventory, inventorySize]
  )
  const category = useMemo(() => getCategoryById(categoryId), [categoryId])

  const displaySlots = useMemo(
    (): InventorySlotCell[] =>
      filterSlotsByCategory(toSlotCells(inventorySlots, 'inventory'), category.types),
    [inventorySlots, category.types]
  )

  const handleRecycleQuality = async (quality: string) => {
    setRecyclingQuality(quality)
    try {
      await sellItemsByQuality(quality)
    } finally {
      setRecyclingQuality(null)
    }
  }

  return {
    categoryId,
    displaySlots,
    handleRecycleQuality,
    qualityStats,
    recyclingQuality,
    setCategoryId,
  }
}
