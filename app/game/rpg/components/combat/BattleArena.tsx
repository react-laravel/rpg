'use client'

import { CLASS_NAMES, type CharacterClass, type CombatMonster, type SkillUsedEntry } from '../../types'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MonsterIcon } from './MonsterIcon'
import { MonsterGroup } from './MonsterGroup'
import { SkillEffect } from './effects'
import { EFFECT_PROFILES, resolveSkillEffect } from './effects/effectRegistry'
import { readBattleEffectAnchors } from './effects/effectAnchors'
import { soundManager } from '../../utils/soundManager'
import { COMBAT_UNIT_PANEL_WIDTH_CLASS } from '../../utils/combatUtils'
import styles from '../../rpg.module.css'

const CHARACTER_DAMAGE_TEXT_MS = 2200
const CHARACTER_REGEN_STAGGER_MS = 350

/** 战斗对阵：上侧怪物（支持多只），下侧用户，中间 VS 可点击开始/停止挂机 */
export function BattleArena({
  character,
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
  onRoundVisualSettled,
}: {
  character: { name: string; class: string; level: number } | null
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
  const hpPercent = combatStats?.max_hp
    ? Math.min(100, Math.max(0, (effectiveCharacterHp / combatStats.max_hp) * 100))
    : 0
  const manaPercent = combatStats?.max_mana
    ? Math.min(100, Math.max(0, (effectiveCharacterMana / combatStats.max_mana) * 100))
    : 0

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

  useEffect(() => {
    if (!skillUsed || monsterAppearBlocking) return
    const soundKey = `${combatRoundKey}:${skillUsed.skill_id}`
    if (soundKey === lastPlayedSkillSoundKeyRef.current) return
    if (computedSkillEffect ? !activeSkillEffect : !showDamageAndHp) return
    lastPlayedSkillSoundKeyRef.current = soundKey
    soundManager.playSkill(skillUsed)
  }, [skillUsed, combatRoundKey, monsterAppearBlocking, computedSkillEffect, activeSkillEffect, showDamageAndHp])

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
    if (computedSkillEffect && EFFECT_PROFILES[computedSkillEffect].target === 'enemy') soundManager.play('combat_hit')
    notifyRoundVisualSettled()
  }, [skillRoundKey, computedSkillEffect, notifyRoundVisualSettled])

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

  // 无视觉技能特效的回合：出现动画结束后展示扣血，再写入战斗日志
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
          className="absolute inset-0 z-20"
        />
      )}

      {/* 内容层：怪物、VS、玩家叠在特效之上，形成立体场景 */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {activeSkillEffect && skillUsed && (
          <div
            key={skillRoundKey}
            style={{ '--cast-color': EFFECT_PROFILES[activeSkillEffect].color, '--cast-duration': `${EFFECT_PROFILES[activeSkillEffect].durationMs}ms` } as React.CSSProperties}
            className={`${styles['skill-cast-banner']} pointer-events-none absolute top-[49%] left-1/2 z-30 -translate-x-1/2`}
          >
            <span className="text-[10px] font-semibold tracking-normal text-white/70">
              释放技能
            </span>
            <strong className="block text-sm tracking-normal text-white sm:text-base">
              {skillUsed.name}
            </strong>
          </div>
        )}

        {/* 上侧：怪物区限高最多三排，给下方角色留出空间 */}
        <div className="flex max-h-[min(52%,16rem)] min-h-[42%] flex-none flex-col items-center justify-end gap-1 overflow-hidden px-2 pt-5 sm:px-4 sm:pt-7">
          {!isLoading && isFighting && hasValidMonsters ? (
            <MonsterGroup
              monsters={displayMonsters}
              skillUsed={skillUsed}
              skillTargetPositions={skillTargetPositions}
              showDamageAndHp={showDamageAndHp}
              onAppearActiveChange={handleAppearActiveChange}
            />
          ) : !isLoading && isFighting && monster ? (
            <div data-effect-target={0} className={isMonsterDead && showDamageAndHp ? styles['monster-death'] : ''}>
              <MonsterIcon key={monsterId} icon={monster.icon} name={monster.name} size="lg" />
            </div>
          ) : isFighting && isLoading ? (
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm sm:text-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              正在寻找敌人
            </div>
          ) : (
            <div className="rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-white/75 backdrop-blur-sm sm:text-sm">
              战斗已暂停
            </div>
          )}
          {!isLoading && isFighting && !hasValidMonsters && !monster && !monsterId && (
            <div className="text-muted-foreground flex-1 text-xs">战斗中</div>
          )}
        </div>

        {/* 下侧：角色（尺寸与单只怪物状态卡对齐） */}
        <div className="mt-auto flex shrink-0 items-end justify-center p-3 sm:p-5">
          <div
            className={`${COMBAT_UNIT_PANEL_WIDTH_CLASS} relative flex flex-col items-center gap-1 rounded-md px-0.5 pb-1`}
          >
            <div className="relative flex flex-col items-center">
              {(characterDamageText != null ||
                characterRegenHpText != null ||
                characterRegenMpText != null) && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-0.5 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap">
                  {characterDamageText != null && (
                    <span className={styles['damage-number']}>-{characterDamageText}</span>
                  )}
                  {(characterRegenHpText != null || characterRegenMpText != null) && (
                    <div className="flex items-center gap-1.5">
                      {characterRegenHpText != null && (
                        <span className={`${styles['regen-number']} text-emerald-300`}>
                          +{characterRegenHpText}
                        </span>
                      )}
                      {characterRegenMpText != null && (
                        <span className={`${styles['regen-number']} text-sky-300`}>
                          +{characterRegenMpText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div
                data-effect-caster
                className={`border-amber-500/80 bg-amber-950/40 text-amber-300 relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold shadow-[0_0_12px_rgba(245,158,11,0.45)] sm:h-16 sm:w-16 sm:text-2xl ${characterHit ? styles['character-hit'] : isFighting ? styles['character-idle'] : ''}`}
              >
                {character?.name?.charAt(0) ?? '?'}
              </div>
            </div>

            <div className="w-full min-w-0 rounded bg-black/45 px-1 py-1 backdrop-blur-sm">
              {combatStats && (
                <div className="space-y-1">
                  <div>
                    <div className="flex min-w-0 items-center justify-between gap-0.5 text-[9px] leading-none text-white/80 sm:text-[10px]">
                      <span className="shrink-0">生命</span>
                      <span
                        className="truncate tabular-nums"
                        title={`${effectiveCharacterHp}/${combatStats.max_hp}`}
                      >
                        {effectiveCharacterHp}/{combatStats.max_hp}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-black/60 ring-1 ring-white/10">
                      <div
                        className={`${styles['health-bar-fill']} h-full bg-gradient-to-r from-red-700 to-rose-400 transition-[width] duration-300`}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex min-w-0 items-center justify-between gap-0.5 text-[9px] leading-none text-white/80 sm:text-[10px]">
                      <span className="shrink-0">魔法</span>
                      <span
                        className="truncate tabular-nums"
                        title={`${effectiveCharacterMana}/${combatStats.max_mana}`}
                      >
                        {effectiveCharacterMana}/{combatStats.max_mana}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-black/60 ring-1 ring-white/10">
                      <div
                        className={`${styles['mana-bar-fill']} h-full bg-gradient-to-r from-blue-700 to-cyan-300 transition-[width] duration-300`}
                        style={{ width: `${manaPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p
              className="w-full truncate px-0.5 text-center text-[9px] font-medium text-white/90 drop-shadow sm:text-[11px]"
              title={character?.name ?? '冒险者'}
            >
              {character?.name ?? '冒险者'}
            </p>
            {character && (
              <p className="w-full truncate px-0.5 text-center text-[8px] text-white/60 sm:text-[9px]">
                Lv.{character.level}{' '}
                {CLASS_NAMES[character.class as CharacterClass] ?? character.class}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
