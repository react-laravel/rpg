'use client'

import { type CombatMonster, type CombatShield, type GameCharacter, type SkillUsedEntry } from '../../types'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MonsterIcon } from './MonsterIcon'
import { MonsterGroup } from './MonsterGroup'
import { CombatResourceBars } from './CombatResourceBars'
import { SkillEffect } from './effects'
import { EFFECT_PROFILES, resolveSkillEffect } from './effects/effectRegistry'
import { getEffectTiming } from './effects/effectTimeline'
import { readBattleEffectAnchors } from './effects/effectAnchors'
import { soundManager } from '../../utils/soundManager'
import { getSkillSoundUrl } from '../../utils/skillSoundRegistry'
import { COMBAT_UNIT_PANEL_WIDTH_CLASS, COMBAT_UNIT_IMAGE_SIZE_CLASS, getCombatMonsterNameClass } from '../../utils/combatUtils'
import styles from '../../rpg.module.css'

const CHARACTER_DAMAGE_TEXT_MS = 2200
const CHARACTER_REGEN_STAGGER_MS = 350

/** 战斗对阵：上侧怪物（支持多只），下侧用户，中间 VS 可点击开始/停止挂机 */
export function BattleArena({
  character,
  pet = null,
  combatStats,
  currentHp,
  currentMana,
  monster,
  monsterId,
  monsterHpBeforeRound,
  monsters,
  isFighting,
  isLoading,
  skillUsed,
  skillTargetPositions,
  combatLogId,
  roundNumber,
  damageTaken,
  roundRegen,
  shield,
  isCrit = false,
  onRoundVisualSettled,
}: {
  character: { name: string; level: number } | null
  pet?: GameCharacter['pet']
  combatStats: { max_hp: number; max_mana: number } | null
  currentHp: number | null
  currentMana: number | null
  monster: {
    name: string
    type: string
    level: number
    icon?: string | null
    hp?: number
    max_hp?: number
  } | null
  monsterId?: number
  monsterHpBeforeRound?: number
  monsters?: (CombatMonster | null)[]
  isFighting: boolean
  isLoading: boolean
  skillUsed?: SkillUsedEntry | null
  skillTargetPositions?: number[]
  combatLogId?: number | null
  roundNumber?: number
  damageTaken?: number
  roundRegen?: Record<string, { name: string; restored: number }> | null
  shield?: CombatShield | null
  isCrit?: boolean
  onRoundVisualSettled?: () => void
}) {
  const finalMonsterHp = monster?.hp ?? 0
  const arenaRef = useRef<HTMLDivElement>(null)
  const lastPlayedSkillSoundKeyRef = useRef<string | null>(null)
  const skillHitKeyRef = useRef<string | null>(null)
  const lastNotifiedRoundRef = useRef<string | null>(null)
  const lastCharacterEffectsLogIdRef = useRef<string | null>(null)
  const combatRoundKey = `${combatLogId ?? 'live'}:${roundNumber ?? skillUsed?.round ?? 0}`
  const hasRoundData = combatLogId != null || roundNumber != null || skillUsed != null
  const characterTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const [displayCharacterHp, setDisplayCharacterHp] = useState<number | null>(null)
  const [displayCharacterMana, setDisplayCharacterMana] = useState<number | null>(null)
  const [characterDamageText, setCharacterDamageText] = useState<number | null>(null)
  const [characterRegenHpText, setCharacterRegenHpText] = useState<number | null>(null)
  const [characterRegenMpText, setCharacterRegenMpText] = useState<number | null>(null)
  const [characterHit, setCharacterHit] = useState(false)
  const [shieldBreaking, setShieldBreaking] = useState(false)
  const lastShieldBreakKeyRef = useRef<string | null>(null)

  const finalCharacterHp = currentHp ?? 0
  const finalCharacterMana = currentMana ?? 0
  const hpRegen = roundRegen?.hp?.restored ?? 0
  const mpRegen = roundRegen?.mp?.restored ?? 0
  const hpAfterMonsterHit = finalCharacterHp - hpRegen
  const hpBeforeMonsterHit = finalCharacterHp + (damageTaken ?? 0) - hpRegen
  const manaBeforeRegen = finalCharacterMana - mpRegen

  const scheduleCharacterTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      characterTimersRef.current.delete(t)
      fn()
    }, ms)
    characterTimersRef.current.add(t)
    return t
  }, [])

  useEffect(() => {
    const timers = characterTimersRef.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  const notifyRoundVisualSettled = useCallback(() => {
    if (!onRoundVisualSettled || !hasRoundData) return
    if (lastNotifiedRoundRef.current === combatRoundKey) return
    lastNotifiedRoundRef.current = combatRoundKey
    onRoundVisualSettled()
  }, [combatRoundKey, hasRoundData, onRoundVisualSettled])

  // 检测怪物死亡
  const isMonsterDead = finalMonsterHp <= 0

  const hasValidMonsters = monsters?.some(m => m != null) ?? false

  const computedSkillEffect = resolveSkillEffect(skillUsed)
  const skillRoundKey = skillUsed && computedSkillEffect
    ? `${combatRoundKey}:${skillUsed.skill_id}:${computedSkillEffect}` : null
  const lastSkillRoundKeyRef = useRef<string | null>(null)
  const [settledSkillRoundKey, setSettledSkillRoundKey] = useState<string | null>(null)
  const [completedSkillRoundKey, setCompletedSkillRoundKey] = useState<string | null>(null)
  const [monsterAppearBlocking, setMonsterAppearBlocking] = useState(false)
  const skillRoundPending = Boolean(skillRoundKey && settledSkillRoundKey !== skillRoundKey)
  const deferDamageDisplay = skillRoundPending || monsterAppearBlocking
  const showDamageAndHp = !deferDamageDisplay
  // The hit releases HP/damage; the canvas stays mounted until its tail has faded.
  const activeSkillEffect = skillRoundKey && completedSkillRoundKey !== skillRoundKey && !monsterAppearBlocking
    ? computedSkillEffect : null

  const effectiveCharacterHp =
    !hasRoundData
      ? finalCharacterHp
      : deferDamageDisplay
        ? hpBeforeMonsterHit
        : (displayCharacterHp ?? finalCharacterHp)
  const effectiveCharacterMana =
    !hasRoundData
      ? finalCharacterMana
      : deferDamageDisplay
        ? manaBeforeRegen
        : (displayCharacterMana ?? finalCharacterMana)

  const handleAppearActiveChange = useCallback((active: boolean) => {
    setMonsterAppearBlocking(active)
  }, [])

  // A new round, stop or revival invalidates all timers from the previous round.
  useEffect(() => {
    const timers = characterTimersRef.current
    timers.forEach(clearTimeout)
    timers.clear()
    queueMicrotask(() => {
      lastCharacterEffectsLogIdRef.current = null
      setDisplayCharacterHp(null)
      setDisplayCharacterMana(null)
      setCharacterDamageText(null)
      setCharacterRegenHpText(null)
      setCharacterRegenMpText(null)
      setCharacterHit(false)
      setShieldBreaking(false)
    })
  }, [combatRoundKey])

  // 与怪物扣血同步：展示角色受击飘字、恢复飘字与血条变化
  useEffect(() => {
    if (!showDamageAndHp || !hasRoundData) return
    if (combatRoundKey === lastCharacterEffectsLogIdRef.current) return

    const taken = damageTaken ?? 0
    const regenDelay = taken > 0 ? CHARACTER_REGEN_STAGGER_MS : 0
    const logId = combatRoundKey
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return
      lastCharacterEffectsLogIdRef.current = logId

      if (taken > 0) {
        setCharacterDamageText(taken)
        setCharacterHit(true)
        setDisplayCharacterHp(hpAfterMonsterHit)
        scheduleCharacterTimeout(() => setCharacterHit(false), 300)
        scheduleCharacterTimeout(() => setCharacterDamageText(null), CHARACTER_DAMAGE_TEXT_MS)
      } else {
        setDisplayCharacterHp(finalCharacterHp)
      }

      if (hpRegen > 0) {
        scheduleCharacterTimeout(() => {
          setCharacterRegenHpText(hpRegen)
          setDisplayCharacterHp(finalCharacterHp)
          scheduleCharacterTimeout(() => setCharacterRegenHpText(null), CHARACTER_DAMAGE_TEXT_MS)
        }, regenDelay)
      }

      if (mpRegen > 0) {
        scheduleCharacterTimeout(() => {
          setCharacterRegenMpText(mpRegen)
          setDisplayCharacterMana(finalCharacterMana)
          scheduleCharacterTimeout(() => setCharacterRegenMpText(null), CHARACTER_DAMAGE_TEXT_MS)
        }, regenDelay)
      } else {
        setDisplayCharacterMana(finalCharacterMana)
      }
    })
    return () => {
      cancelled = true
    }
  }, [
    showDamageAndHp,
    combatRoundKey,
    hasRoundData,
    damageTaken,
    hpRegen,
    mpRegen,
    hpAfterMonsterHit,
    finalCharacterHp,
    finalCharacterMana,
    scheduleCharacterTimeout,
  ])

  useLayoutEffect(() => {
    lastSkillRoundKeyRef.current = skillRoundKey
    if (!skillRoundKey) {
      skillHitKeyRef.current = null
      lastPlayedSkillSoundKeyRef.current = null
      queueMicrotask(() => {
        if (lastSkillRoundKeyRef.current != null) return
        setSettledSkillRoundKey(null)
        setCompletedSkillRoundKey(null)
      })
    }
    if (!hasRoundData) lastNotifiedRoundRef.current = null
  }, [skillRoundKey, hasRoundData])

  const handleSkillSoundStart = useCallback(() => {
    if (!skillUsed || !activeSkillEffect) return
    const soundKey = `${combatRoundKey}:${skillUsed.skill_id}`
    if (soundKey === lastPlayedSkillSoundKeyRef.current) return
    lastPlayedSkillSoundKeyRef.current = soundKey
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timing = getEffectTiming(EFFECT_PROFILES[activeSkillEffect], undefined, reducedMotion)
    soundManager.playSkill(skillUsed, { hitAtMs: timing.hitMs })
  }, [skillUsed, activeSkillEffect, combatRoundKey])

  // 多怪物：延迟显示时传扣血前数据
  const displayMonsters = useMemo(() => {
    const list = monsters ?? []
    if (!deferDamageDisplay || list.length === 0) return list
    return list.map(m => {
      if (m == null) return m
      const rawTaken = (m as CombatMonster & { damage_taken?: number }).damage_taken ?? 0
      // 后端用 -1 表示未受击，只有 >=0 才是实际受到的伤害，用于还原扣血前血量
      const taken = rawTaken >= 0 ? rawTaken : 0
      const beforeHp = Math.min(m.max_hp ?? 99999, (m.hp ?? 0) + taken)
      return { ...m, hp: beforeHp, damage_taken: undefined } as typeof m
    })
  }, [monsters, deferDamageDisplay])

  const resolveAnchors = useCallback(() => readBattleEffectAnchors(
    arenaRef.current, skillTargetPositions, skillUsed?.target_type === 'all'
  ), [skillTargetPositions, skillUsed?.target_type])

  const settleRound = useCallback(() => {
    if (!skillRoundKey || lastSkillRoundKeyRef.current !== skillRoundKey || skillHitKeyRef.current === skillRoundKey) return
    skillHitKeyRef.current = skillRoundKey
    setSettledSkillRoundKey(skillRoundKey)
    if (
      computedSkillEffect &&
      EFFECT_PROFILES[computedSkillEffect].target === 'enemy' &&
      !getSkillSoundUrl(skillUsed)
    ) {
      soundManager.play('combat_hit')
    }
    notifyRoundVisualSettled()
  }, [skillRoundKey, computedSkillEffect, notifyRoundVisualSettled, skillUsed])

  const handleSkillComplete = useCallback(() => {
    if (!skillRoundKey || lastSkillRoundKeyRef.current !== skillRoundKey) return
    settleRound()
    setCompletedSkillRoundKey(skillRoundKey)
  }, [settleRound, skillRoundKey])

  // The canvas owns timing; this only recovers from an unavailable renderer.
  useEffect(() => {
    if (!activeSkillEffect || !skillRoundKey) return
    const watchdog = setTimeout(handleSkillComplete, EFFECT_PROFILES[activeSkillEffect].durationMs + 300)
    return () => clearTimeout(watchdog)
  }, [activeSkillEffect, skillRoundKey, handleSkillComplete])

  // 无视觉技能特效时：出现动画结束后展示扣血，再写入战斗日志
  useEffect(() => {
    if (monsterAppearBlocking || deferDamageDisplay) return
    if (skillUsed && computedSkillEffect) return
    if (!hasRoundData || lastNotifiedRoundRef.current === combatRoundKey) return

    const timer = setTimeout(() => {
      soundManager.play('combat_hit')
      notifyRoundVisualSettled()
    }, 150)

    return () => clearTimeout(timer)
  }, [
    monsterAppearBlocking,
    deferDamageDisplay,
    skillUsed,
    computedSkillEffect,
    combatRoundKey,
    hasRoundData,
    notifyRoundVisualSettled,
  ])

  const shieldActive = (shield?.hp ?? 0) > 0
  const shieldCasting = skillUsed?.effect_key === 'shield' || skillUsed?.name === '魔法护盾'

  useEffect(() => {
    if (!shield?.broke) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || lastShieldBreakKeyRef.current === combatRoundKey) return
      lastShieldBreakKeyRef.current = combatRoundKey
      setShieldBreaking(true)
      soundManager.play('shield_break')
      scheduleCharacterTimeout(() => setShieldBreaking(false), 620)
    })
    return () => {
      cancelled = true
    }
  }, [shield?.broke, combatRoundKey, scheduleCharacterTimeout])

  return (
    <div ref={arenaRef} data-battle-arena className="absolute inset-0 isolate flex flex-col items-stretch">
      <div className={styles['battlefield-vignette']} aria-hidden />
      <div className={styles['battlefield-ground']} aria-hidden />

      {/* Bounded transparent particles stay above the actors; all pointer input passes through. */}
      {activeSkillEffect && skillRoundKey && (
        <SkillEffect
          key={skillRoundKey}
          type={activeSkillEffect}
          active={true}
          resolveAnchors={resolveAnchors}
          seed={(skillUsed?.skill_id ?? 1) * 31 + (roundNumber ?? combatLogId ?? 0)}
          onComplete={handleSkillComplete}
          onHit={settleRound}
          onStart={handleSkillSoundStart}
          className="absolute inset-0 z-20"
        />
      )}

      {/* 内容层：怪物、VS、玩家叠在特效之上，形成立体场景 */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* 上侧：五个固定怪物槽位，给下方角色与施法提示留出空间 */}
        <div className="flex max-h-[min(60%,16rem)] min-h-[42%] flex-none flex-col items-center justify-end gap-1 overflow-hidden px-2 pt-16 sm:px-4">
          {!isLoading && isFighting && hasValidMonsters ? (
            <MonsterGroup
              monsters={displayMonsters}
              skillUsed={skillUsed}
              skillTargetPositions={skillTargetPositions}
              showDamageAndHp={showDamageAndHp}
              isCrit={isCrit}
              onAppearActiveChange={handleAppearActiveChange}
            />
          ) : !isLoading && isFighting && monster ? (
            <div className={`${COMBAT_UNIT_PANEL_WIDTH_CLASS} flex flex-col items-center gap-1 ${isMonsterDead && showDamageAndHp ? styles['monster-death'] : ''}`}>
              {monster.max_hp != null && <CombatResourceBars hp={monster.hp ?? 0} maxHp={monster.max_hp} />}
              <div data-effect-target={0}>
                <MonsterIcon key={monsterId} icon={monster.icon} name={monster.name} />
              </div>
              <p data-monster-name className={`${getCombatMonsterNameClass(monster.type)} w-full truncate text-center text-[9px] leading-3 font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,1)] sm:text-[11px] sm:leading-4`}>{monster.name}</p>
            </div>
          ) : isFighting ? (
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm sm:text-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              正在寻找敌人
            </div>
          ) : (
            <div className="rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-white/75 backdrop-blur-sm sm:text-sm">
              战斗已暂停
            </div>
          )}
        </div>

        <div data-cast-space className="relative flex min-h-6 flex-1 items-center justify-center">
          {activeSkillEffect && skillUsed && (
            <div
              key={skillRoundKey}
              data-skill-cast-banner
              style={{ '--cast-color': EFFECT_PROFILES[activeSkillEffect].color, '--cast-duration': `${EFFECT_PROFILES[activeSkillEffect].durationMs}ms` } as React.CSSProperties}
              className={`${styles['skill-cast-banner']} pointer-events-none relative z-30`}
            >
              <span className="hidden text-[10px] font-semibold tracking-normal text-white/70 sm:block">
                释放技能
              </span>
              <strong className="block text-xs tracking-normal text-white sm:text-base">
                {skillUsed.name}
              </strong>
            </div>
          )}

        </div>

        {/* 下侧：宝宝站在角色旁边。怪物反击随机打其中一边 */}
        <div className="flex shrink-0 items-end justify-center gap-2 px-3 pb-3 sm:gap-3 sm:px-5 sm:pb-5">
          {pet && (
            <div className="flex w-16 shrink-0 flex-col items-center gap-1" data-pet={pet.hp > 0 ? 'alive' : 'down'}>
              <CombatResourceBars hp={pet.hp} maxHp={pet.max_hp} />
              <div
                className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold sm:h-14 sm:w-14 ${
                  pet.hp > 0
                    ? 'border-teal-300/80 bg-teal-950/50 text-teal-100'
                    : 'border-white/20 bg-black/40 text-white/40'
                }`}
              >
                {pet.name.slice(0, 1)}
              </div>
              <p className="w-full truncate text-center text-[9px] leading-3 font-semibold text-white drop-shadow sm:text-[11px]">
                {pet.name} {pet.level}级
              </p>
            </div>
          )}
          <div
            className={`${COMBAT_UNIT_PANEL_WIDTH_CLASS} relative flex flex-col items-center gap-1 rounded-md`}
          >
            {combatStats && (
              <CombatResourceBars
                hp={effectiveCharacterHp}
                maxHp={combatStats.max_hp}
                mana={effectiveCharacterMana}
                maxMana={combatStats.max_mana}
              />
            )}
            <div className="relative flex flex-col items-center">
              {(characterDamageText != null ||
                characterRegenHpText != null ||
                characterRegenMpText != null) && (
                <div className="pointer-events-none absolute bottom-0 left-full z-20 ml-1 flex flex-col items-start gap-0.5 whitespace-nowrap">
                  {characterDamageText != null && (
                    <span className={styles['damage-number']}>-{characterDamageText}</span>
                  )}
                  {(characterRegenHpText != null || characterRegenMpText != null) && (
                    <div className="flex items-center gap-1.5">
                      {characterRegenHpText != null && (
                        <span
                          className={`${styles['regen-number']} ${styles['regen-hp']}`}
                          data-floating="hp-regen"
                        >
                          +{characterRegenHpText}
                        </span>
                      )}
                      {characterRegenMpText != null && (
                        <span
                          className={`${styles['regen-number']} ${styles['regen-mp']}`}
                          data-floating="mp-regen"
                        >
                          +{characterRegenMpText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div
                data-combat-unit-image="character"
                className={`relative ${COMBAT_UNIT_IMAGE_SIZE_CLASS} shrink-0 ${characterHit ? styles['character-hit'] : ''}`}
              >
                {(shieldActive || shieldBreaking || shieldCasting) && (
                  <span
                    className={`${styles['character-shield']} ${shieldCasting && !shieldBreaking ? styles['character-shield-cast'] : ''} ${shieldBreaking ? styles['character-shield-break'] : ''}`}
                    data-shield={shieldBreaking ? 'break' : 'active'}
                    aria-hidden
                  />
                )}
                <div
                  data-effect-caster
                  className={`border-amber-500/80 bg-amber-950/40 text-amber-300 relative flex h-full w-full items-center justify-center rounded-full border-2 text-xl font-bold shadow-[0_0_12px_rgba(245,158,11,0.45)] sm:text-2xl ${!characterHit && isFighting ? styles['character-idle'] : ''}`}
                >
                  {character?.name?.charAt(0) ?? '?'}
                </div>
                {shieldActive && (
                  <span className={styles['character-shield-hp']} data-testid="character-shield-hp">
                    {shield?.hp}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
