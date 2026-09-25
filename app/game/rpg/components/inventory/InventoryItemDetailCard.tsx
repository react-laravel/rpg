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
} from '../../utils/itemUtils'
import { ItemTipIcon } from '@/components/game/ItemTipIcon'
import type { ItemDefinition } from '../../types'

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

const GEM_STAT_COLOR: Record<string, string> = {
  attack: 'bg-red-500/25 text-red-200',
  defense: 'bg-sky-500/25 text-sky-200',
  max_hp: 'bg-emerald-500/25 text-emerald-200',
  max_mana: 'bg-cyan-500/25 text-cyan-100',
  crit_rate: 'bg-amber-500/25 text-amber-200',
  crit_damage: 'bg-violet-500/25 text-violet-200',
}

function gemMarkClass(definition: ItemDefinition | undefined): string {
  const stat = Object.keys(definition?.gem_stats ?? {})[0]
  return GEM_STAT_COLOR[stat] ?? 'bg-white/10 text-white/70'
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
    <ul className="mt-2 space-y-1">
      {Array.from({ length: socketCount }, (_, index) => {
        const gem = gemsBySocket.get(index)
        const definition = gem ? getSocketedGemDefinition(gem) : undefined
        const name = definition?.name || '宝石'
        const statLine = formatGemStatLine(definition)

        if (!gem) {
          return (
            <li
              key={`empty-${index}`}
              className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed border-white/15 px-2 py-1.5 text-xs"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-dashed border-white/20 text-[10px]">
                {index + 1}
              </span>
              <span>空孔</span>
            </li>
          )
        }

        return (
          <li key={gem.id}>
            <button
              type="button"
              onClick={() => onUnsocketGem?.(gem.socket_index)}
              disabled={isLoading || !onUnsocketGem}
              aria-label={`取下 ${name}`}
              className="flex w-full items-center gap-2 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-1.5 text-left hover:bg-white/10 disabled:opacity-50"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm ${gemMarkClass(definition)}`}
              >
                ◆
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-cyan-50">{name}</span>
                {statLine && (
                  <span className="text-muted-foreground block truncate text-[10px]">{statLine}</span>
                )}
              </span>
              <span className="text-muted-foreground shrink-0 text-[10px]">取下</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function EquipmentDetailBody({
  item,
  isLoading = false,
  onUnsocketGem,
  showBuyPrice = false,
}: EquipmentDetailBodyProps) {
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
      <EquipmentGemSockets item={item} isLoading={isLoading} onUnsocketGem={onUnsocketGem} />

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
        <ItemTipIcon item={item} className="shrink-0 drop-shadow-lg" />

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

          <EquipmentDetailBody
            item={item}
            isLoading={isLoading}
            onUnsocketGem={onUnsocketGem}
            showBuyPrice={showBuyPrice}
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
