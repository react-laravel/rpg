'use client'

import type { ReactNode } from 'react'
import { CopperDisplay } from '../shared/CopperDisplay'
import { GameItem, QUALITY_COLORS, QUALITY_NAMES, STAT_NAMES } from '../../types'
import {
  formatGemStatLine,
  formatItemStatValue,
  getDisplayableItemStats,
  getEffectiveSocketCount,
  getItemDisplayName,
  getItemTotalStats,
  getSocketedGemDefinition,
  socketedGemIconItem,
} from '../../utils/itemUtils'
import { ItemIcon } from '@/components/game/ItemIcon'
import { ItemTipIcon } from '@/components/game/ItemTipIcon'

interface InventoryItemDetailCardProps {
  item: GameItem
  onClose: () => void
  footer?: ReactNode
  isLoading?: boolean
  onUnsocketGem?: (socketIndex: number) => void
  showBuyPrice?: boolean
}

interface EquipmentDetailBodyProps {
  item: GameItem
  isLoading?: boolean
  onUnsocketGem?: (socketIndex: number) => void
  showBuyPrice?: boolean
}

export function EquipmentGemSockets({
  item,
  isLoading = false,
  onUnsocketGem,
}: Pick<EquipmentDetailBodyProps, 'item' | 'isLoading' | 'onUnsocketGem'>) {
  const socketCount = Math.max(
    getEffectiveSocketCount(item.sockets),
    ...(item.gems?.map(gem => gem.socket_index + 1) ?? [0])
  )
  if (socketCount <= 0) return null

  const gemsBySocket = new Map(item.gems?.map(gem => [gem.socket_index, gem]) ?? [])

  return (
    <ul className="flex w-full flex-wrap justify-center gap-1">
      {Array.from({ length: socketCount }, (_, index) => {
        const gem = gemsBySocket.get(index)
        const definition = gem ? getSocketedGemDefinition(gem) : undefined
        const name = definition?.name || '宝石'
        const statLine = formatGemStatLine(definition)
        const iconItem = gem ? socketedGemIconItem(gem) : null
        const detail = statLine ? `${name} ${statLine}` : name

        if (!gem || !iconItem) {
          return (
            <li key={`empty-${index}`}>
              <span
                className="border-border text-muted-foreground flex h-7 w-7 items-center justify-center rounded border border-dashed text-[10px]"
                title="空孔"
              >
                空
              </span>
            </li>
          )
        }

        const icon = (
          <span className="relative block h-7 w-7">
            <ItemIcon item={iconItem} />
          </span>
        )

        return (
          <li key={gem.id}>
            {onUnsocketGem ? (
              <button
                type="button"
                onClick={() => onUnsocketGem(gem.socket_index)}
                disabled={isLoading}
                aria-label={`取下 ${detail}`}
                title={`取下 ${detail}`}
                className="hover:bg-white/10 rounded p-0.5 disabled:opacity-50"
              >
                {icon}
              </button>
            ) : (
              <span className="block p-0.5" title={detail}>
                {icon}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function EquipmentDetailBody({
  item,
  showBuyPrice = false,
}: Pick<EquipmentDetailBodyProps, 'item' | 'showBuyPrice'>) {
  const displayStats = getDisplayableItemStats(getItemTotalStats(item))
  const hasBuyPrice =
    showBuyPrice && item.definition?.buy_price != null && item.definition.buy_price > 0
  const hasStatBlock = Object.keys(displayStats).length > 0 || hasBuyPrice

  return (
    <>
      {item.definition?.description && (
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {item.definition.description}
        </p>
      )}

      {hasStatBlock && (
        <div className="mt-1 space-y-0.5 text-xs">
          {Object.entries(displayStats).map(([stat, value]) => (
            <p key={stat} className="text-green-600 dark:text-green-400">
              +{formatItemStatValue(Number(value), stat)} {STAT_NAMES[stat] || stat}
            </p>
          ))}
          {hasBuyPrice && (
            <p className="text-purple-600 dark:text-purple-400">
              售价:{' '}
              <CopperDisplay
                copper={item.definition!.buy_price!}
                size="sm"
                nowrap
                className="font-medium"
              />
            </p>
          )}
        </div>
      )}
      <p
        className={`text-muted-foreground flex items-center gap-1 text-xs ${hasStatBlock ? 'mt-1' : ''}`}
      >
        卖出:{' '}
        <CopperDisplay
          copper={item.sell_price ?? Math.floor((item.definition?.buy_price ?? 0) / 2)}
          size="sm"
          nowrap
          className="font-medium"
        />
      </p>
    </>
  )
}

export function InventoryItemDetailCard({
  item,
  onClose,
  footer,
  isLoading = false,
  onUnsocketGem,
  showBuyPrice = false,
}: InventoryItemDetailCardProps) {
  return (
    <div className="flex flex-col">
      <div
        className="relative flex gap-3 p-3"
        style={{
          background: `linear-gradient(135deg, ${QUALITY_COLORS[item.quality]}20 0%, ${QUALITY_COLORS[item.quality]}10 100%)`,
          borderBottom: `1px solid ${QUALITY_COLORS[item.quality]}30`,
        }}
      >
        <div className="flex w-[100px] shrink-0 flex-col items-center gap-1">
          <ItemTipIcon item={item} className="drop-shadow-lg" />
          <EquipmentGemSockets item={item} isLoading={isLoading} onUnsocketGem={onUnsocketGem} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h5
                className="min-w-0 text-sm leading-tight font-bold break-words sm:text-base"
                style={{ color: QUALITY_COLORS[item.quality] }}
              >
                {getItemDisplayName(item)}
              </h5>
              <span className="text-xs" style={{ color: QUALITY_COLORS[item.quality] }}>
                {QUALITY_NAMES[item.quality]}
              </span>
              <p className="text-muted-foreground mt-0.5 text-xs">
                需求等级: {item.definition?.required_level ?? '—'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground ml-1 shrink-0 p-1"
            >
              ✕
            </button>
          </div>

          <EquipmentDetailBody item={item} showBuyPrice={showBuyPrice} />
        </div>
      </div>

      {footer ? (
        <div className="border-border bg-muted/30 flex flex-wrap gap-1.5 border-t p-2.5">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
