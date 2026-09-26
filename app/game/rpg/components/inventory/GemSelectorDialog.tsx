'use client'

import { ItemIcon } from '@/components/game/ItemIcon'
import type { GameItem } from '../../types'
import { formatGemStatLine, getEffectiveSocketCount } from '../../utils/itemUtils'

interface GemSelectorDialogProps {
  isOpen: boolean
  socketItem: GameItem | null
  gems: GameItem[]
  onClose: () => void
  onSelect: (gemItem: GameItem, socketIndex: number) => void
}

const getFirstEmptySocketIndex = (item: GameItem) => {
  const usedIndices = new Set(item.gems?.map(gem => gem.socket_index) ?? [])
  const socketCount = getEffectiveSocketCount(item.sockets)

  for (let i = 0; i < socketCount; i += 1) {
    if (!usedIndices.has(i)) return i
  }

  return -1
}

export function GemSelectorDialog({
  isOpen,
  socketItem,
  gems,
  onClose,
  onSelect,
}: GemSelectorDialogProps) {
  if (!isOpen || !socketItem) return null

  const availableSocketCount =
    getEffectiveSocketCount(socketItem.sockets) - (socketItem.gems?.length ?? 0)

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border-border w-full max-w-sm rounded-lg border p-4 sm:p-6">
        <h4 className="text-foreground mb-3 text-base font-bold sm:mb-4 sm:text-lg">
          选择宝石 (还可镶嵌 {availableSocketCount} 个)
        </h4>
        {gems.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">背包中没有宝石</p>
        ) : (
          <ul className="mb-4 max-h-72 space-y-1 overflow-y-auto">
            {gems.map(gem => {
              const emptyIndex = getFirstEmptySocketIndex(socketItem)
              const name = gem.definition?.name || '宝石'
              const statLine = formatGemStatLine(gem.definition)

              return (
                <li key={gem.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (emptyIndex >= 0) onSelect(gem, emptyIndex)
                    }}
                    disabled={availableSocketCount <= 0}
                    className="hover:bg-muted flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left disabled:opacity-50"
                  >
                    <span className="relative h-8 w-8 shrink-0">
                      <ItemIcon item={gem} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{name}</span>
                      {statLine && (
                        <span className="text-muted-foreground block truncate text-xs">{statLine}</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-muted text-foreground hover:bg-secondary rounded px-3 py-2 text-sm sm:px-4"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
