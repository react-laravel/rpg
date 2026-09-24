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

interface WeaponPose {
  grip: number[]
  angle: number
  bounds: { left: number; top: number; right: number; bottom: number }
}

export function CharacterPortrait({ gender, armor, weapon }: CharacterPortraitProps) {
  const appearance = getCharacterAppearance(gender, armor)
  const [failedBody, setFailedBody] = useState<string | null>(null)
  const [failedWeapon, setFailedWeapon] = useState<string | null>(null)
  const [failedFingers, setFailedFingers] = useState<string | null>(null)
  const weaponSrc = weapon?.definition?.type === 'weapon'
    ? getRpgItemImageUrl(weapon.definition.icon, weapon.definition_id)
    : ''
  const showWeapon = Boolean(weaponSrc && failedWeapon !== weaponSrc)
  const requestedBodySrc = showWeapon ? appearance.heldSrc : appearance.src
  const fallbackBodySrc = showWeapon ? appearance.heldFallbackSrc : appearance.fallbackSrc
  const outfit = failedBody === requestedBodySrc ? 'base' : appearance.outfit
  const bodySrc = outfit === 'base' ? fallbackBodySrc : requestedBodySrc
  const fingerSrc = bodySrc.replace(/-held\.png$/, '-fingers.png')
  const poses = showWeapon ? manifest.heldPortraits : manifest.portraits
  const { hand } = poses[`${appearance.gender}-${outfit}`]
  const weaponPose = (manifest.weapons as Record<string, WeaponPose>)[weaponSrc]
    ?? { grip: [0.5, 0.65625], angle: -28, bounds: { left: -0.8, top: -0.9, right: 0.8, bottom: 0.9 } }
  const weaponSize = 88
  // Fit the complete tilted weapon and body between the two equipment columns.
  const left = showWeapon ? Math.min(0, hand[0] + weaponPose.bounds.left * weaponSize - 4) : 0
  const top = showWeapon ? Math.min(0, hand[1] + weaponPose.bounds.top * weaponSize - 4) : 0
  const right = showWeapon ? Math.max(manifest.width, hand[0] + weaponPose.bounds.right * weaponSize + 4) : manifest.width
  const bottom = showWeapon ? Math.max(manifest.height, hand[1] + weaponPose.bounds.bottom * weaponSize + 4) : manifest.height
  const frameWidth = right - left, frameHeight = bottom - top
  const bodyLabel = `${appearance.gender === 'female' ? '女' : '男'}法师，${outfit === 'base' ? '基础便装' : armor?.definition.name}`

  return (
    <div
      role="img"
      aria-label={`${bodyLabel}${showWeapon ? `，手持${weapon?.definition.name}` : '，空手'}`}
      data-character-portrait
      data-outfit={outfit}
      data-gender={appearance.gender}
      data-pose={showWeapon ? 'holding' : 'resting'}
      className="pointer-events-none relative isolate w-full select-none"
      style={{ aspectRatio: `${frameWidth} / ${frameHeight}` }}
    >
      <div
        className="absolute"
        style={{ left: `${-left / frameWidth * 100}%`, top: `${-top / frameHeight * 100}%`, width: `${manifest.width / frameWidth * 100}%`, height: `${manifest.height / frameHeight * 100}%` }}
      >
        <Image
          key={bodySrc}
          data-character-body
          src={bodySrc}
          alt=""
          fill
          sizes="(max-width: 768px) 74vw, 600px"
          className="z-0 object-contain drop-shadow-[0_6px_5px_rgba(0,0,0,0.35)]"
          onError={() => setFailedBody(requestedBodySrc)}
        />
      {showWeapon && (
          <div
            className="absolute z-10"
            data-held-weapon-layer
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
      )}
      {showWeapon && failedFingers !== fingerSrc && (
        <Image
          key={fingerSrc}
          data-character-fingers
          src={fingerSrc}
          alt=""
          fill
          sizes="(max-width: 768px) 74vw, 600px"
          className="z-20 object-contain"
          onError={() => setFailedFingers(fingerSrc)}
        />
      )}
      </div>
    </div>
  )
}
