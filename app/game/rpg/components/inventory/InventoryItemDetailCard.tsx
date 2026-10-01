'use client'

import { useState, type ReactNode } from 'react'
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
import { ItemActionButton } from './ItemActionButton'

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
  showSellPrice?: boolean
}

const SOCKET_SLOT_CLASS =
  'relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border'

export function EquipmentGemSockets({
  item,
  isLoading = false,
  onUnsocketGem,
  /** Constrain the socket icons row (e.g. w-[100px] to sit under the item art). */
  socketsClassName = 'justify-center',
}: Pick<EquipmentDetailBodyProps, 'item' | 'isLoading' | 'onUnsocketGem'> & {
  socketsClassName?: string
}) {
  const socketCount = Math.max(
    getEffectiveSocketCount(item.sockets),
    ...(item.gems?.map(gem => gem.socket_index + 1) ?? [0])
  )
  // Tie expansion to item.id so switching items collapses without an effect.
  const [expansion, setExpansion] = useState<{ itemId: number; socketIndex: number } | null>(null)
  const expandedSocketIndex =
    expansion && expansion.itemId === item.id ? expansion.socketIndex : null

  if (socketCount <= 0) return null

  const gemsBySocket = new Map(item.gems?.map(gem => [gem.socket_index, gem]) ?? [])
  const expandedGem =
    expandedSocketIndex == null ? undefined : gemsBySocket.get(expandedSocketIndex)
  const expandedDefinition = expandedGem ? getSocketedGemDefinition(expandedGem) : undefined
  const expandedIconItem = expandedGem ? socketedGemIconItem(expandedGem) : null
  const canInteract = Boolean(onUnsocketGem)
  const expandedStatLine = formatGemStatLine(expandedDefinition)

  const toggleSocket = (socketIndex: number) => {
    setExpansion(current =>
      current?.itemId === item.id && current.socketIndex === socketIndex
        ? null
        : { itemId: item.id, socketIndex }
    )
  }

  const handleUnsocket = () => {
    if (expandedSocketIndex == null || !onUnsocketGem) return
    onUnsocketGem(expandedSocketIndex)
    setExpansion(null)
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <ul className={`flex flex-wrap gap-1.5 ${socketsClassName}`.trim()}>
        {Array.from({ length: socketCount }, (_, index) => {
          const gem = gemsBySocket.get(index)
          const definition = gem ? getSocketedGemDefinition(gem) : undefined
          const name = definition?.name || '宝石'
          const statLine = formatGemStatLine(definition)
          const iconItem = gem ? socketedGemIconItem(gem) : null
          const detail = statLine ? `${name} ${statLine}` : name
          const isExpanded = expandedSocketIndex === index

          if (!gem || !iconItem) {
            return (
              <li key={`empty-${index}`}>
                <span
                  className={`${SOCKET_SLOT_CLASS} border-border/70 text-muted-foreground border-dashed bg-black/20 text-[10px]`}
                  title="空孔"
                >
                  空
                </span>
              </li>
            )
          }

          const icon = <ItemIcon item={iconItem} sizes="32px" />

          if (!canInteract) {
            return (
              <li key={gem.id}>
                <span
                  className={`${SOCKET_SLOT_CLASS} border-border/60 bg-black/35`}
                  title={detail}
                >
                  {icon}
                </span>
              </li>
            )
          }

          return (
            <li key={gem.id}>
              <button
                type="button"
                onClick={() => toggleSocket(gem.socket_index)}
                disabled={isLoading}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? `收起 ${detail}` : `查看 ${detail}`}
                title={isExpanded ? `收起 ${detail}` : `查看 ${detail}`}
                className={`${SOCKET_SLOT_CLASS} border-border/60 bg-black/35 transition-colors hover:border-white/35 hover:bg-black/50 disabled:opacity-50 ${
                  isExpanded
                    ? 'border-cyan-400/70 bg-cyan-950/40 ring-1 ring-cyan-400/50'
                    : ''
                }`}
              >
                {icon}
              </button>
            </li>
          )
        })}
      </ul>

      {expandedGem && expandedDefinition && expandedIconItem ? (
        <div
          className="border-border/60 bg-muted/35 rounded-md border px-2.5 py-2 shadow-sm"
          data-testid="gem-expand-panel"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`${SOCKET_SLOT_CLASS} border-border/60 bg-black/35`}
              aria-hidden
            >
              <ItemIcon item={expandedIconItem} sizes="32px" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-foreground text-xs leading-tight font-medium break-words">
                {expandedDefinition.name || '宝石'}
              </p>
              {expandedStatLine ? (
                <p className="mt-0.5 text-[11px] leading-snug text-green-600 dark:text-green-400">
                  {expandedStatLine}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {onUnsocketGem ? (
                <ItemActionButton
                  onClick={handleUnsocket}
                  disabled={isLoading}
                  variant="unequip"
                  className="px-2.5 py-1"
                >
                  卸下
                </ItemActionButton>
              ) : null}
              <button
                type="button"
                onClick={() => setExpansion(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-white/10 flex h-7 w-7 items-center justify-center rounded-md text-xs"
                aria-label="收起宝石详情"
                title="收起"
              >
                ▴
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function EquipmentDetailBody({
  item,
  showBuyPrice = false,
  showSellPrice = true,
}: Pick<EquipmentDetailBodyProps, 'item' | 'showBuyPrice' | 'showSellPrice'>) {
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
      {showSellPrice && (
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
      )}
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
        className="relative grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-2 p-3"
        style={{
          background: `linear-gradient(135deg, ${QUALITY_COLORS[item.quality]}20 0%, ${QUALITY_COLORS[item.quality]}10 100%)`,
          borderBottom: `1px solid ${QUALITY_COLORS[item.quality]}30`,
        }}
      >
        <div className="flex justify-center self-start">
          <ItemTipIcon item={item} className="drop-shadow-lg" />
        </div>

        <div className="min-w-0">
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

        <div className="col-span-2 min-w-0">
          <EquipmentGemSockets
            item={item}
            isLoading={isLoading}
            onUnsocketGem={onUnsocketGem}
            socketsClassName="w-[100px] justify-center"
          />
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
