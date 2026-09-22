'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import Image from '@/components/game/GameImage'
import type { GameItem, ItemQuality } from '@/app/game/rpg/types'
import { QUALITY_COLORS } from '@/app/game/rpg/types'
import { getItemIconFallback } from '@/app/game/rpg/utils/itemUtils'
import { getRpgItemImageUrl } from '@/app/game/rpg/utils/assetUrls'
import { ItemImagePreview } from './ItemImagePreview'

/** 物品详情中的大图标 */
export const ItemTipIcon = memo(function ItemTipIcon({
  item,
  className,
}: {
  item: GameItem
  className?: string
}) {
  const definitionId = item.definition?.id
  const fallback = getItemIconFallback(item)
  const src = useMemo(
    () => getRpgItemImageUrl(item.definition?.icon, definitionId),
    [item.definition?.icon, definitionId]
  )
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const handleError = useCallback(() => setFailedSource(src), [src])

  return (
    <ItemImagePreview
      item={item}
      className={`relative inline-flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-lg border-2 shadow-sm ${className ?? ''}`}
      style={{ borderColor: QUALITY_COLORS[item.quality as ItemQuality] }}
    >
      {src && failedSource !== src ? (
        <Image
          src={src}
          alt=""
          fill
          className="rounded-md object-contain p-1"
          sizes="100px"
          onError={handleError}
        />
      ) : (
        <span className="text-5xl drop-shadow-sm">{fallback}</span>
      )}
    </ItemImagePreview>
  )
})
