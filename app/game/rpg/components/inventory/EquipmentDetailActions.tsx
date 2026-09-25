'use client'

import type { GameItem } from '../../types'
import { ItemActionButton } from './ItemActionButton'

interface EquipmentDetailActionsProps {
  canSocket: boolean
  gemsInInventoryCount: number
  isLoading: boolean
  item: GameItem
  onOpenGemSelector: (item: GameItem) => void
  onUnequip: () => void
}

export function EquipmentDetailActions({
  canSocket,
  gemsInInventoryCount,
  isLoading,
  item,
  onOpenGemSelector,
  onUnequip,
}: EquipmentDetailActionsProps) {
  return (
    <>
      <ItemActionButton onClick={onUnequip} disabled={isLoading} variant="unequip">
        卸下
      </ItemActionButton>
      {canSocket && (
        <ItemActionButton
          onClick={() => onOpenGemSelector(item)}
          disabled={isLoading || gemsInInventoryCount === 0}
          variant="socket"
        >
          镶嵌
        </ItemActionButton>
      )}
    </>
  )
}
