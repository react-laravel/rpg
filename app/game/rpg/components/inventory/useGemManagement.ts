'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { GameItem } from '../../types'
import { getEffectiveSocketCount } from '../../utils/itemUtils'

interface UseGemManagementParams {
  inventory: GameItem[]
  onSocketComplete?: () => void
  onUnsocketComplete?: () => void
  socketGem: (itemId: number, gemItemId: number, socketIndex: number) => Promise<GameItem | null>
  unsocketGem: (itemId: number, socketIndex: number) => Promise<unknown>
}

export const getGemsInInventory = (items: GameItem[]) =>
  items.filter(item => item.definition?.type === 'gem')

export const canSocketItem = (item: GameItem): boolean => {
  const socketCount = getEffectiveSocketCount(item.sockets)
  if (socketCount <= 0) return false
  const gemCount = item.gems?.length ?? 0
  return gemCount < socketCount
}

export function useGemManagement({
  inventory,
  onSocketComplete,
  onUnsocketComplete,
  socketGem,
  unsocketGem,
}: UseGemManagementParams) {
  const [showGemSelector, setShowGemSelector] = useState(false)
  const [selectedSocketItem, setSelectedSocketItem] = useState<GameItem | null>(null)
  const [isSocketing, setIsSocketing] = useState(false)
  const socketingRef = useRef(false)
  const selectorSessionRef = useRef(0)

  const gemsInInventory = useMemo(() => getGemsInInventory(inventory), [inventory])

  const closeGemSelector = useCallback(() => {
    selectorSessionRef.current += 1
    setShowGemSelector(false)
    setSelectedSocketItem(null)
  }, [])

  const openGemSelector = useCallback((item: GameItem) => {
    selectorSessionRef.current += 1
    setSelectedSocketItem(item)
    setShowGemSelector(true)
  }, [])

  const handleSocketGem = useCallback(
    async (gemItem: GameItem, socketIndex: number) => {
      if (!selectedSocketItem || socketingRef.current) return

      socketingRef.current = true
      const selectorSession = selectorSessionRef.current
      setIsSocketing(true)
      try {
        const updated = await socketGem(selectedSocketItem.id, gemItem.id, socketIndex)
        if (!updated || selectorSession !== selectorSessionRef.current) return

        const gemsLeft = gemsInInventory.some(
          gem => gem.id !== gemItem.id || gem.quantity > 1
        )
        if (canSocketItem(updated) && gemsLeft) {
          setSelectedSocketItem(updated)
          return
        }

        closeGemSelector()
        onSocketComplete?.()
      } finally {
        socketingRef.current = false
        setIsSocketing(false)
      }
    },
    [closeGemSelector, gemsInInventory, onSocketComplete, selectedSocketItem, socketGem]
  )

  const handleUnsocketGem = useCallback(
    async (item: GameItem | null, socketIndex: number) => {
      if (!item) return

      await unsocketGem(item.id, socketIndex)
      onUnsocketComplete?.()
    },
    [onUnsocketComplete, unsocketGem]
  )

  return {
    closeGemSelector,
    gemsInInventory,
    handleSocketGem,
    isSocketing,
    handleUnsocketGem,
    openGemSelector,
    selectedSocketItem,
    showGemSelector,
  }
}
