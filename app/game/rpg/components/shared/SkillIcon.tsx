'use client'

import Image from '@/components/game/GameImage'
import { memo, useCallback, useMemo, useState } from 'react'
import { getRpgSkillImageUrl } from '../../utils/assetUrls'

/** 同一技能线按 effect_key 共用图标，缺失时使用 icon 文件名或文字占位。 */
export const SkillIcon = memo(function SkillIcon({
  icon,
  effectKey,
  name,
  size = 'md',
}: {
  icon?: string | null
  effectKey?: string | null
  name: string
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'sm' ? 'h-5 w-5 text-xs' : 'h-8 w-8 text-base sm:h-9 sm:w-9'
  const imageSize = size === 'sm' ? '20px' : '36px'
  const iconFile = useMemo(() => {
    if (effectKey) {
      return effectKey.endsWith('.png') ? effectKey : `${effectKey}.png`
    }
    if (icon && /\.(png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i.test(icon)) return icon
    return null
  }, [effectKey, icon])
  const fallback = icon && icon.length <= 4 ? icon : name && name[0] ? name[0] : '?'
  const src = useMemo(() => (iconFile ? getRpgSkillImageUrl(iconFile) : ''), [iconFile])
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const handleError = useCallback(() => setFailedSrc(src), [src])

  return (
    <span
      className={`relative flex items-center justify-center overflow-hidden rounded-lg ${sizeClass}`}
    >
      {src && failedSrc !== src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-contain"
          sizes={imageSize}
          onError={handleError}
        />
      ) : (
        fallback
      )}
    </span>
  )
})
