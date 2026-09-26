'use client'

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { GameItem } from '../../types'
import { useGameStore } from '../../stores/gameStore'
import { GemSelectorDialog } from './GemSelectorDialog'
import { InventoryGrid } from './InventoryGrid'
import { InventoryToolbar } from './InventoryToolbar'
import { SellQuantityDialog } from './SellQuantityDialog'
import {
  getEquippedItemFor,
  getEquippedRingItems,
  hasEquippedItemFor,
} from './inventoryEquipmentUtils'
import { useInventoryPanelActions } from './useInventoryPanelActions'
import { useInventoryPanelView } from './useInventoryPanelView'

export function InventoryPanel() {
  const {
    inventory,
    inventorySize,
    equipment,
    equipItem,
    sellItem,
    sellItemsByQuality,
    sortInventory,
    socketGem,
    unsocketGem,
    isLoading,
  } = useGameStore(
    useShallow(s => ({
      inventory: s.inventory,
      inventorySize: s.inventorySize,
      equipment: s.equipment,
      equipItem: s.equipItem,
      sellItem: s.sellItem,
      sellItemsByQuality: s.sellItemsByQuality,
      sortInventory: s.sortInventory,
      socketGem: s.socketGem,
      unsocketGem: s.unsocketGem,
      isLoading: s.isLoading,
    }))
  )

  const {
    canSocket,
    canUnsocket,
    closeGemSelector,
    closeSellConfirm,
    gemsInInventory,
    getCompareActions,
    handleCompareAction,
    handleEquip,
    handleSell,
    handleSellConfirm,
    handleSocketGem,
    handleUnsocketGem,
    openGemSelector,
    selectedItem,
    selectedItemId,
    selectedSocketItem,
    sellQuantity,
    setSelectedItem,
    setSellQuantity,
    showGemSelector,
    showSellConfirm,
  } = useInventoryPanelActions({
    equipItem,
    inventory,
    sellItem,
    socketGem,
    unsocketGem,
  })

  const {
    categoryId,
    displaySlots,
    handleRecycleQuality,
    qualityStats,
    recyclingQuality,
    setCategoryId,
  } = useInventoryPanelView({
    inventory,
    inventorySize,
    sellItemsByQuality,
  })

  const getEquippedItem = useCallback(
    (item: GameItem) => getEquippedItemFor(equipment, item),
    [equipment]
  )
  const getEquippedRings = useCallback(() => getEquippedRingItems(equipment), [equipment])
  const hasEquippedItem = useCallback(
    (item: GameItem) => hasEquippedItemFor(equipment, item),
    [equipment]
  )
  const onEquip = useCallback(() => void handleEquip(), [handleEquip])
  const onSell = useCallback(() => void handleSell(), [handleSell])
  const onUnsocketGem = useCallback(
    (socketIndex: number) => void handleUnsocketGem(socketIndex),
    [handleUnsocketGem]
  )

  return (
    <>
      <GemSelectorDialog
        isOpen={showGemSelector}
        socketItem={selectedSocketItem}
        gems={gemsInInventory}
        onClose={closeGemSelector}
        onSelect={handleSocketGem}
      />
      <SellQuantityDialog
        isOpen={showSellConfirm}
        item={selectedItem}
        quantity={sellQuantity}
        isLoading={isLoading}
        onQuantityChange={setSellQuantity}
        onClose={closeSellConfirm}
        onConfirm={handleSellConfirm}
      />
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row">
        <div className="bg-card border-border flex min-w-0 flex-1 flex-col rounded-lg border p-3 sm:p-4">
          <InventoryToolbar
            categoryId={categoryId}
            isLoading={isLoading}
            onCategoryChange={setCategoryId}
            onRecycleQuality={handleRecycleQuality}
            onSort={sortInventory}
            qualityStats={qualityStats}
            recyclingQuality={recyclingQuality}
          />

          <InventoryGrid
            canSocket={canSocket}
            canUnsocket={canUnsocket}
            displaySlots={displaySlots}
            gemsInInventoryCount={gemsInInventory.length}
            getCompareActions={getCompareActions}
            getEquippedItem={getEquippedItem}
            getEquippedRings={getEquippedRings}
            handleCompareAction={handleCompareAction}
            hasEquippedItem={hasEquippedItem}
            isLoading={isLoading}
            onEquip={onEquip}
            onOpenGemSelector={openGemSelector}
            onSelectedItemChange={setSelectedItem}
            onSell={onSell}
            onUnsocketGem={onUnsocketGem}
            selectedItemId={selectedItemId}
          />
        </div>
      </div>
    </>
  )
}
