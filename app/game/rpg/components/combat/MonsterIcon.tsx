'use client'

import Image from '@/components/game/GameImage'
import { memo, useCallback, useMemo, useState } from 'react'
import { getRpgMonsterImageUrl } from '../../utils/assetUrls'
import { COMBAT_UNIT_IMAGE_SIZE_CLASS } from '../../utils/combatUtils'

/** 怪物图标：仅使用后端返回的英文 icon 文件名，缺失时回退为文字占位。 */
export const MonsterIcon = memo(function MonsterIcon({
  icon,
  name,
}: {
  icon?: string | null
  name: string
}) {
  const fallback = name && name[0] ? name[0] : '?'
  const src = useMemo(() => getRpgMonsterImageUrl(icon), [icon])
  const pixel = src.includes('/game/rpg/pixel-v1/')
  const [failed, setFailed] = useState(false)
  const handleError = useCallback(() => setFailed(true), [])

  if (!src || failed) {
    return (
      <span
        data-combat-unit-image="monster"
        className={`relative flex shrink-0 items-center justify-center overflow-hidden text-xl text-white ${COMBAT_UNIT_IMAGE_SIZE_CLASS}`}
      >
        {fallback}
      </span>
    )
  }

  return (
    <span
      data-combat-unit-image="monster"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${COMBAT_UNIT_IMAGE_SIZE_CLASS}`}
    >
      <Image
        src={src}
        alt={name}
        fill
        className={pixel ? 'object-contain' : 'object-cover'}
        sizes="(min-width: 640px) 64px, 56px"
        onError={handleError}
      />
    </span>
  )
})
