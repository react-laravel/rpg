'use client'

import { useGameStore } from '../../stores/gameStore'
import {
  type CombatLog as CombatLogType,
  type CombatMonster,
  type CombatResult,
  type SkillUsedEntry,
} from '../../types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CharacterSkill, SkillWithLearnedState } from '../../types'
import { getMapBackgroundStyle } from '../../utils/mapBackground'
import { BattleArena } from './BattleArena'
import { BattleSkillBar, type SkillBarLayout } from './BattleSkillBar'
import { CombatLogList } from './CombatLogList'
import { VSSwords } from './VSSwords'
import {
  getPrimaryCombatMonster,
  getPrimaryCombatMonsterId,
  normalizeCombatMonsterSlots,
} from '../../utils/combatUtils'
import { extractCombatLogId } from '../../stores/combatHelpers'
import { CombatMapPicker } from './CombatMapPicker'
import { MapFarmStats } from './MapFarmStats'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  LoaderCircle,
  GalleryHorizontal,
  History,
  LayoutGrid,
  RotateCcw,
  Skull,
  Sparkles,
  X,
} from 'lucide-react'
import interfaceStyles from '../../interface.module.css'
const SKILL_BAR_LAYOUT_KEY = 'rpg-skill-bar-layout'

function readSkillBarLayout(): SkillBarLayout {
  if (typeof window === 'undefined') return 'wrap'
  return localStorage.getItem(SKILL_BAR_LAYOUT_KEY) === 'row' ? 'row' : 'wrap'
}

export function CombatPanel() {
  const currentMap = useGameStore(state => state.currentMap)
  const maps = useGameStore(state => state.maps)
  const enterMap = useGameStore(state => state.enterMap)
  const fetchMaps = useGameStore(state => state.fetchMaps)
  const revive = useGameStore(state => state.revive)
  const isFighting = useGameStore(state => state.isFighting)
  const setShouldAutoCombat = useGameStore(state => state.setShouldAutoCombat)
  const startCombat = useGameStore(state => state.startCombat)
  const stopCombat = useGameStore(state => state.stopCombat)
  const combatAction = useGameStore(state => state.combatAction)
  const pendingMapId = useGameStore(state => state.pendingMapId)
  const error = useGameStore(state => state.error)
  const isLoading = combatAction != null || pendingMapId != null
  const combatLogs = useGameStore(state => state.combatLogs)
  const combatResult = useGameStore(state => state.combatResult)
  const flushPendingCombatLog = useGameStore(state => state.flushPendingCombatLog)
  const statusCombatMonsters = useGameStore(state => state.statusCombatMonsters)
  const statusCombatShield = useGameStore(state => state.statusCombatShield)
  const skills = useGameStore(state => state.skills)
  const character = useGameStore(state => state.character)
  const combatStats = useGameStore(state => state.combatStats)
  const currentHp = useGameStore(state => state.currentHp)
  const currentMana = useGameStore(state => state.currentMana)
  const enabledSkillIds = useGameStore(state => state.enabledSkillIds)
  const toggleEnabledSkill = useGameStore(state => state.toggleEnabledSkill)

  const [showDeathDialog, setShowDeathDialog] = useState(false)
  const [skillBarLayout, setSkillBarLayout] = useState<SkillBarLayout>(() => readSkillBarLayout())
  const wasDeadRef = useRef(false)
  const isCharacterDead = currentHp != null && currentHp <= 0 && (combatStats?.max_hp ?? 0) > 0
  const handleRoundVisualSettled = useCallback(() => {
    flushPendingCombatLog()
  }, [flushPendingCombatLog])

  // 战斗场景动画异常未回调时，兜底写入战斗日志，避免一直卡在 pending
  useEffect(() => {
    const logId = combatResult?.combat_log_id
    if (!logId || !isFighting) return

    const watchdog = setTimeout(() => {
      const state = useGameStore.getState()
      if (state.pendingCombatLog && extractCombatLogId(state.pendingCombatLog) === logId) {
        state.flushPendingCombatLog()
      }
    }, 3200)

    return () => clearTimeout(watchdog)
  }, [combatResult?.combat_log_id, isFighting])

  useEffect(() => {
    if (isCharacterDead && !wasDeadRef.current) {
      queueMicrotask(() => setShowDeathDialog(true))
    }
    wasDeadRef.current = isCharacterDead
  }, [isCharacterDead])

  const characterId = character?.id
  const currentMapId = currentMap?.id

  // 刚注册角色进入战斗界面时，若无当前地图则默认进入第一张地图（按幕数、等级、id 排序）
  useEffect(() => {
    if (!characterId || currentMapId) return
    let cancelled = false
    const ensureFirstMap = async () => {
      if (maps.length === 0) await fetchMaps()
      if (cancelled) return
      const state = useGameStore.getState()
      if (state.currentMap || state.maps.length === 0) return
      const sorted = [...state.maps].sort(
        (a, b) => (a.act !== b.act ? a.act - b.act : 0) || a.id - b.id
      )
      const first = sorted[0]
      if (first) await enterMap(first.id)
    }
    ensureFirstMap()
    return () => {
      cancelled = true
    }
  }, [characterId, currentMapId, maps.length, fetchMaps, enterMap])

  const learnedSkills = useMemo((): CharacterSkill[] => {
    const c = character
    if (!c) return []
    return skills
      .filter(
        (s): s is SkillWithLearnedState & { character_skill_id: number } =>
          s.is_learned && s.character_skill_id != null
      )
      .map(s => ({
        id: s.character_skill_id!,
        character_id: c.id,
        skill_id: s.id,
        skill: s,
        level: s.level ?? 1,
        slot_index: s.slot_index ?? null,
      }))
  }, [skills, character])

  const activeSkills = useMemo(
    () =>
      learnedSkills.filter(
        s =>
          s.skill?.type === 'active' &&
          (s.skill?.node_tier === 0 ||
            s.skill?.node_tier === undefined ||
            s.skill?.node_tier === null)
      ),
    [learnedSkills]
  )
  // skill_cooldowns 是剩余冷却次数；旧服务端曾发到期回合号，rounds>0 时相减兼容
  const skillCooldowns = useMemo(() => {
    const cooldowns = combatResult?.skill_cooldowns ?? {}
    const currentRound = combatResult?.rounds ?? 0
    const result: Record<number, number> = {}
    for (const [skillId, value] of Object.entries(cooldowns)) {
      const remaining = currentRound > 0 ? (value as number) - currentRound : (value as number)
      result[Number(skillId)] = remaining > 0 ? remaining : 0
    }
    return result
  }, [combatResult?.skill_cooldowns, combatResult?.rounds])

  const handleStartCombat = async () => {
    setShouldAutoCombat(true)
    await startCombat()
  }

  // 角色死亡时，点击只是复活，不自动开始战斗
  const handleRevive = async () => {
    const success = await revive()
    if (success) setShowDeathDialog(false)
  }

  const handleStopCombat = async () => {
    await stopCombat()
  }

  const handleCombatToggle = isCharacterDead
    ? handleRevive
    : isFighting
      ? handleStopCombat
      : handleStartCombat

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className={`${interfaceStyles.combatGrid} grid items-start gap-3 xl:gap-4`}>
        {/* 战场 */}
        <section className={`${interfaceStyles.panel} ${interfaceStyles.arenaPanel} relative overflow-hidden`}>
          {currentMap ? (
            <div
              className="relative mx-auto aspect-[4/5] w-full overflow-hidden sm:aspect-[4/3] lg:aspect-[16/10]"
              style={getMapBackgroundStyle(currentMap, { useOrigin: true, fill: true })}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-2 py-2 sm:px-3">
                <div className="pointer-events-auto min-w-0 flex-1">
                  <CombatMapPicker overlay />
                </div>
                <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                  <VSSwords
                    isFighting={isFighting}
                    isLoading={isLoading}
                    isDead={isCharacterDead}
                    onToggle={handleCombatToggle}
                    variant="inline"
                  />
                </div>
              </div>
              <BattleArena
                character={
                  character
                    ? { name: character.name, level: character.level }
                    : null
                }
                combatStats={combatStats}
                currentHp={currentHp}
                currentMana={currentMana}
                monster={
                  combatResult?.monster ?? getPrimaryCombatMonster(statusCombatMonsters) ?? null
                }
                monsterId={
                  combatResult?.monster_id ??
                  getPrimaryCombatMonsterId(statusCombatMonsters) ??
                  undefined
                }
                monsterHpBeforeRound={combatResult?.monster_hp_before_round}
                monsters={normalizeCombatMonsterSlots(
                  combatResult?.monsters ?? statusCombatMonsters
                )}
                isFighting={isFighting}
                isLoading={isLoading}
                skillUsed={combatResult?.skills_used?.[0]}
                skillTargetPositions={combatResult?.skill_target_positions}
                combatLogId={combatResult?.combat_log_id ?? null}
                roundNumber={combatResult?.rounds}
                damageTaken={combatResult?.damage_taken}
                roundRegen={combatResult?.round_regen}
                shield={combatResult?.shield ?? statusCombatShield}
                onRoundVisualSettled={handleRoundVisualSettled}
              />
              <MapFarmStats />
            </div>
          ) : (
            <div className="relative flex min-h-72 flex-col">
              <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-3">
                <CombatMapPicker />
              </div>
              <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
                正在准备战场...
              </div>
            </div>
          )}
        </section>

        {/* 作战侧栏 */}
        <aside className="flex min-w-0 flex-col gap-3">
          {currentMap && activeSkills.length > 0 && (
            <section className={`${interfaceStyles.panel} p-3 sm:p-4`}>
              <div className={`${interfaceStyles.panelHeading} justify-between`}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className={interfaceStyles.headingIcon}>
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold">技能</h3>
                  <span className={interfaceStyles.statusPill}>
                    {activeSkills.filter(skill => enabledSkillIds.includes(skill.skill_id)).length}/{activeSkills.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSkillBarLayout(prev => {
                      const next: SkillBarLayout = prev === 'row' ? 'wrap' : 'row'
                      localStorage.setItem(SKILL_BAR_LAYOUT_KEY, next)
                      return next
                    })
                  }}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-ring flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2"
                  title={skillBarLayout === 'row' ? '切换为多行显示' : '切换为单行滚动'}
                  aria-label={skillBarLayout === 'row' ? '切换为多行显示' : '切换为单行滚动'}
                >
                  {skillBarLayout === 'row' ? (
                    <LayoutGrid className="h-4 w-4" />
                  ) : (
                    <GalleryHorizontal className="h-4 w-4" />
                  )}
                </button>
              </div>
              <BattleSkillBar
                activeSkills={activeSkills}
                skillsUsed={combatResult?.skills_used}
                skillCooldowns={skillCooldowns}
                enabledSkillIds={enabledSkillIds}
                onSkillToggle={toggleEnabledSkill}
                disabled={isCharacterDead || isLoading}
                layout={skillBarLayout}
              />
            </section>
          )}

          <section className={`${interfaceStyles.panel} flex min-h-0 flex-col p-3 sm:p-4 xl:flex-1`}>
            <div className={interfaceStyles.panelHeading}>
              <span className={interfaceStyles.headingIcon}>
                <History aria-hidden="true" className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold">战斗记录</h3>
              {combatLogs.length > 0 && (
                <span className="text-muted-foreground ml-auto text-xs">
                  最近 {Math.min(50, combatLogs.length)} 条
                </span>
              )}
            </div>
            <div className="min-h-0 max-h-72 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1 xl:basis-0 xl:max-h-none">
              <CombatLogList logs={combatLogs} />
            </div>
          </section>
        </aside>
      </div>

      <Dialog
        open={showDeathDialog}
        onOpenChange={open => {
          if (!isLoading) setShowDeathDialog(open)
        }}
      >
        <DialogPortal>
          <DialogOverlay />
        </DialogPortal>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-sm rounded-xl p-6 text-center"
          onEscapeKeyDown={event => {
            if (isLoading) event.preventDefault()
          }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-500">
            <Skull aria-hidden="true" className="h-7 w-7" />
          </div>
          <DialogTitle>角色已阵亡</DialogTitle>
          <DialogDescription>
            战斗已自动停止。复活后可调整装备与技能，再继续冒险。
          </DialogDescription>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleRevive}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg font-medium disabled:cursor-wait disabled:opacity-60"
          >
            {combatAction === 'reviving' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {combatAction === 'reviving' ? '正在复活…' : '复活角色'}
          </button>
          <button
            type="button"
            onClick={() => setShowDeathDialog(false)}
            disabled={isLoading}
            className="border-border text-muted-foreground hover:bg-muted flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border font-medium disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            稍后再说
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
