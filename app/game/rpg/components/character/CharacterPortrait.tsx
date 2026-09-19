'use client'

import { useState } from 'react'
import Image from '@/components/game/GameImage'
import type { GameItem } from '../../types'
import { getCharacterAppearance } from '../../utils/characterAppearance'
import { getRpgItemImageUrl } from '../../utils/assetUrls'
import manifest from '../../data/character-appearance-manifest.json'

interface CharacterPortraitProps {
  gender?: string
  armor?: GameItem | null
  weapon?: GameItem | null
}

export function CharacterPortrait({ gender, armor, weapon }: CharacterPortraitProps) {
  const appearance = getCharacterAppearance(gender, armor)
  const [failedBody, setFailedBody] = useState<string | null>(null)
  const [failedWeapon, setFailedWeapon] = useState<string | null>(null)
  const outfit = failedBody === appearance.src ? 'base' : appearance.outfit
  const bodySrc = outfit === 'base' ? appearance.fallbackSrc : appearance.src
  const { hand } = manifest.portraits[`${appearance.gender}-${outfit}`]
  const weaponSrc = weapon?.definition?.type === 'weapon'
    ? getRpgItemImageUrl(weapon.definition.icon, weapon.definition_id)
    : ''
  const showWeapon = Boolean(weaponSrc && failedWeapon !== weaponSrc)
  const weaponPose = (manifest.weapons as Record<string, { grip: number[]; angle: number }>)[weaponSrc]
    ?? { grip: [0.5, 0.65625], angle: 0 }
  const weaponSize = 136
  const bodyLabel = `${appearance.gender === 'female' ? '女' : '男'}法师，${outfit === 'base' ? '基础便装' : armor?.definition.name}`

  return (
    <div
      role="img"
      aria-label={`${bodyLabel}${showWeapon ? `，手持${weapon?.definition.name}` : '，空手'}`}
      data-character-portrait
      data-outfit={outfit}
      data-gender={appearance.gender}
      className="pointer-events-none relative aspect-[6/7] w-full select-none"
    >
      <Image
        key={bodySrc}
        src={bodySrc}
        alt=""
        fill
        sizes="(max-width: 768px) 74vw, 600px"
        className="object-contain drop-shadow-[0_6px_5px_rgba(0,0,0,0.35)]"
        onError={() => setFailedBody(appearance.src)}
      />
      {showWeapon && (
        <>
          <div
            className="absolute"
            style={{
              width: `${weaponSize / manifest.width * 100}%`,
              height: `${weaponSize / manifest.height * 100}%`,
              left: `${(hand[0] - weaponPose.grip[0] * weaponSize) / manifest.width * 100}%`,
              top: `${(hand[1] - weaponPose.grip[1] * weaponSize) / manifest.height * 100}%`,
              transform: `rotate(${weaponPose.angle}deg)`,
              transformOrigin: `${weaponPose.grip[0] * 100}% ${weaponPose.grip[1] * 100}%`,
            }}
          >
            <Image
              key={weaponSrc}
              data-character-weapon
              src={weaponSrc}
              alt=""
              fill
              sizes="(max-width: 768px) 68vw, 550px"
              className="object-contain"
              onError={() => setFailedWeapon(weaponSrc)}
            />
          </div>
          {/* Restore the fingers over the staff so every weapon shares the same grip. */}
          <Image
            src={bodySrc}
            alt=""
            fill
            sizes="(max-width: 768px) 74vw, 600px"
            className="object-contain"
            style={{ clipPath: `inset(${(hand[1] - 6) / manifest.height * 100}% ${(manifest.width - hand[0] - 4) / manifest.width * 100}% ${(manifest.height - hand[1] - 6) / manifest.height * 100}% ${(hand[0] - 4) / manifest.width * 100}%)` }}
          />
        </>
      )}
    </div>
  )
}
