'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { ZoomIn } from 'lucide-react'
import Image from './GameImage'
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { GameItem } from '@/app/game/rpg/types'
import { QUALITY_COLORS } from '@/app/game/rpg/types'
import { getItemDisplayName, getItemIconFallback } from '@/app/game/rpg/utils/itemUtils'
import { getRpgItemImageUrl } from '@/app/game/rpg/utils/assetUrls'

/** Shared zoom control for inventory, equipped items and both sides of a comparison. */
export function ItemImagePreview({ item, children, className, style }: {
  item: GameItem
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const src = getRpgItemImageUrl(item.definition?.icon, item.definition_id)
  const name = getItemDisplayName(item)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default ${className ?? ''}`}
          style={style}
          disabled={!src}
          title={src ? `查看${name}大图` : '暂无装备图片'}
          aria-label={`查看${name}大图`}
          onClick={event => event.stopPropagation()}
        >
          {children}
          {src && <span aria-hidden className="absolute right-0 bottom-0 rounded-tl bg-black/70 p-0.5 text-white"><ZoomIn className="h-3 w-3" /></span>}
        </button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="z-[10100]" onClick={event => event.stopPropagation()} />
      </DialogPortal>
      <DialogContent
        className="z-[10101] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg gap-3 overflow-y-auto rounded-xl p-4"
        onClick={event => event.stopPropagation()}
        onEscapeKeyDown={event => event.stopPropagation()}
      >
        <DialogTitle className="pr-8" style={{ color: QUALITY_COLORS[item.quality] }}>{name}</DialogTitle>
        <div className="bg-muted/30 relative mx-auto aspect-square w-full max-w-[min(100%,65dvh)] rounded-lg" data-item-image-preview>
          {src && failedSource !== src ? (
            <Image key={src} src={src} alt={name} fill sizes="(max-width: 560px) 85vw, 480px" className="object-contain p-4" onError={() => setFailedSource(src)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <span className="text-6xl" aria-hidden>{getItemIconFallback(item)}</span>
              <p className="text-muted-foreground text-sm">图片暂时无法加载</p>
              <button type="button" className="text-primary text-sm underline" onClick={() => setFailedSource(null)}>重试</button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
