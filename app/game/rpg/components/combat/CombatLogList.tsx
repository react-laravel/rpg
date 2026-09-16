'use client'

import {
  QUALITY_COLORS,
  QUALITY_NAMES,
  STAT_NAMES,
  type CombatLog as CombatLogType,
  type CombatResult,
  type GameItem,
  type CombatLogDetail,
} from '../../types'
import { useMemo, useState, useEffect } from 'react'
import { CopperDisplay } from '../shared/CopperDisplay'
import { ItemDetailModal, ItemIcon } from '@/components/game'
import { SkillIcon } from '../shared/SkillIcon'
import { get } from '@/lib/api'
import { useGameStore } from '../../stores/gameStore'
import {
  buildCombatLogDetailFromEntry,
  extractCombatLogId,
  getCombatLogMonsterName,
  type CombatLogEntry,
} from '../../stores/combatHelpers'
import { formatItemStatValue } from '../../utils/itemUtils'
import { Award, ChevronRight, CircleCheckBig, Coins, ScrollText, Shield, Skull, Swords, Target, X, Zap } from 'lucide-react'
import type { SkillUsedEntry } from '../../types'
import interfaceStyles from '../../interface.module.css'

function CombatLogSkillIcons({ skills }: { skills: SkillUsedEntry[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {skills.map((skill, idx) => {
        const useCount = skill.use_count ?? 1
        return (
          <span
            key={`${skill.skill_id}-${idx}`}
            className="relative inline-flex"
            title={useCount > 1 ? `${skill.name} ×${useCount}` : skill.name}
          >
            <SkillIcon icon={skill.icon} effectKey={skill.effect_key} name={skill.name} size="sm" />
            {useCount > 1 && (
              <span className="bg-background text-foreground absolute -right-0.5 -bottom-0.5 rounded px-0.5 text-[9px] leading-none font-semibold shadow-sm">
                ×{useCount}
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

function filterPlayerSkillsUsed(skills: SkillUsedEntry[] | undefined, playerSkillIds: Set<number>) {
  if (!skills?.length || playerSkillIds.size === 0) return []
  return skills.filter(skill => playerSkillIds.has(skill.skill_id))
}

function CombatLogLootIcon({ item, onClick }: { item: GameItem; onClick: () => void }) {
  const qualityColor = QUALITY_COLORS[item.quality]
  return (
    <button
      type="button"
      className="border-border relative inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border p-px transition-shadow hover:shadow-md sm:h-6 sm:w-6"
      style={{
        borderColor: qualityColor,
        background: `linear-gradient(135deg, ${qualityColor}15 0%, ${qualityColor}08 100%)`,
      }}
      title={item.definition.name}
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
    >
      <ItemIcon item={item} className="drop-shadow-sm" />
    </button>
  )
}

function ItemDetailDialog({ item, onClose }: { item: GameItem; onClose: () => void }) {
  return (
    <ItemDetailModal
      isOpen={true}
      item={item}
      onClose={onClose}
      type="inventory"
      source="inventory"
    />
  )
}

/** 战斗日志详情弹窗 */
function CombatLogDetailDialog({
  logId,
  fallbackLog,
  playerSkillIds,
  onClose,
}: {
  logId: number
  fallbackLog: CombatLogEntry | null
  playerSkillIds: Set<number>
  onClose: () => void
}) {
  const selectedCharacterId = useGameStore(state => state.selectedCharacterId)
  const [detail, setDetail] = useState<CombatLogDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setDetail(null)

      if (!selectedCharacterId) {
        if (!cancelled) setStatus('error')
        return
      }

      try {
        const response = await get<{ log?: CombatLogDetail }>(
          `/rpg/combat/logs/${logId}?character_id=${selectedCharacterId}`
        )
        if (!cancelled && response.log) {
          setDetail(response.log)
          setStatus('ready')
          return
        }
      } catch {
        // API 不可用时回退到列表快照（常见于本地 API + 远端 WebSocket）
      }

      const local = fallbackLog ? buildCombatLogDetailFromEntry(fallbackLog, logId) : null
      if (!cancelled) {
        if (local) {
          setDetail(local)
          setStatus('ready')
        } else {
          setStatus('error')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [logId, fallbackLog, selectedCharacterId])

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-card border-border rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">加载中...</p>
          <button onClick={onClose} className="text-primary mt-4 hover:underline">
            关闭
          </button>
        </div>
      </div>
    )
  }

  if (status === 'error' || !detail) {
    return (
      <div className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-card border-border rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">日志不存在</p>
          <button onClick={onClose} className="text-primary mt-4 hover:underline">
            关闭
          </button>
        </div>
      </div>
    )
  }

  const d = detail
  const playerSkillsUsed = filterPlayerSkillsUsed(d.skills_used, playerSkillIds)
  const hasBattleInfo = d.battle?.alive_count != null || d.battle?.killed_count != null

  return (
    <div className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border-border relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-lg border">
        <button
          onClick={onClose}
          className="hover:bg-muted absolute top-2 right-2 z-10 rounded-full p-1"
          aria-label="关闭战斗日志详情"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pt-4 pb-3 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pt-6 sm:pb-4">
          <div className="space-y-3">
            <h3 className="text-foreground flex items-center gap-2 pr-8 text-lg font-bold">
              {d.victory
                ? '✅ 胜利'
                : (d.duration_seconds ?? 0) > 0
                  ? '💀 战败'
                  : '⚔️ 战斗中'}
              <span className="text-muted-foreground text-sm font-normal">
                {d.map?.name || '未知地图'}
              </span>
            </h3>

            {/* 角色属性 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                角色属性 (Lv.{d.character?.level ?? '?'})
              </h4>
              {d.character?.attack != null ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                    <Swords className="h-4 w-4 shrink-0 text-red-500" />
                    <span>攻击: {d.character.attack}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                    <Shield className="h-4 w-4 shrink-0 text-blue-500" />
                    <span>防御: {d.character.defense}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                    <Zap className="h-4 w-4 shrink-0 text-yellow-500" />
                    <span>暴击: {formatItemStatValue(d.character.crit_rate, 'crit_rate')}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">暂无数据（旧日志）</p>
              )}
            </div>

            {/* 怪物属性 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-muted-foreground mb-2 flex items-center gap-1 text-sm font-medium">
                <Skull className="h-4 w-4" />
                怪物信息 (Lv.{d.monster_stats?.level ?? '?'} {d.monster?.name ?? '?'})
              </h4>
              {d.monster_stats?.hp != null ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>攻击: {d.monster_stats.attack}</div>
                  <div>防御: {d.monster_stats.defense}</div>
                  <div>
                    HP: {d.monster_stats.hp}/{d.monster_stats.max_hp}
                  </div>
                  <div>经验: {d.monster_stats.experience}</div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">暂无数据（旧日志）</p>
              )}
            </div>

            {/* 伤害详情 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-muted-foreground mb-2 flex items-center gap-1 text-sm font-medium">
                <Target className="h-4 w-4" />
                伤害构成
              </h4>
              {d.damage_detail?.total != null ? (
                <div className="space-y-1 text-sm">
                  {(d.damage_detail.skill_damage ?? 0) > 0 || playerSkillsUsed.length > 0 ? (
                    <div className="flex justify-between gap-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="shrink-0">技能伤害:</span>
                        {playerSkillsUsed.length > 0 && (
                          <CombatLogSkillIcons skills={playerSkillsUsed} />
                        )}
                      </span>
                      {(d.damage_detail.skill_damage ?? 0) > 0 ? (
                        <span className="shrink-0 text-orange-500">
                          {d.damage_detail.skill_damage}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>普攻伤害:</span>
                      <span className="text-red-500">{d.damage_detail.base_attack}</span>
                    </div>
                  )}
                  {d.damage_detail.crit_damage > 0 && (
                    <div className="flex justify-between">
                      <span>暴击额外伤害:</span>
                      <span className="text-yellow-500">+{d.damage_detail.crit_damage}</span>
                    </div>
                  )}
                  {d.damage_detail.aoe_damage > 0 && (
                    <div className="flex justify-between">
                      <span>AOE减免:</span>
                      <span className="text-gray-500">-{d.damage_detail.aoe_damage}</span>
                    </div>
                  )}
                  <div className="border-muted flex justify-between border-t pt-1 font-medium">
                    <span>实际造成:</span>
                    <span className="text-red-500">{d.damage_detail.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>怪物防御减免:</span>
                    <span className="text-gray-500">
                      {Math.round((d.monster_stats?.defense ?? 0) * (d.damage_detail.defense_reduction ?? 0.5))}
                      （系数{' '}
                      {(
                        d.damage_detail.defense_reduction_percent ??
                        (d.damage_detail.defense_reduction ?? 0) * 100
                      ).toFixed(0)}
                      %）
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>怪物反击伤害:</span>
                    <span className="text-green-500">-{d.damage_detail.counter_damage}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">暂无数据（旧日志）</p>
              )}
            </div>

            {/* 战斗信息 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">战斗信息</h4>
              {hasBattleInfo ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>存活: {d.battle.alive_count}只</div>
                  <div>击杀: {d.battle.killed_count}只</div>
                  <div>
                    难度: {d.difficulty?.tier ?? 0} ({d.difficulty?.multiplier ?? 1}x)
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">暂无数据（旧日志）</p>
              )}
            </div>

            {/* 收益 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-muted-foreground mb-2 flex items-center gap-1 text-sm font-medium">
                <Award className="h-4 w-4" />
                收益
              </h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-purple-500">+{d.experience_gained} 经验</span>
                {(d.copper_gained ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Coins className="h-4 w-4 shrink-0" />+{d.copper_gained} 铜币
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

export function CombatLogList({ logs }: { logs: (CombatResult | CombatLogType)[] }) {
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(null)
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null)
  const [selectedLog, setSelectedLog] = useState<CombatLogEntry | null>(null)
  const skills = useGameStore(state => state.skills)
  const playerSkillIds = useMemo(() => {
    const ids = new Set<number>()
    skills.forEach(skill => {
      if (!skill.is_learned || skill.type !== 'active') return
      ids.add(skill.id)
      if (skill.character_skill_id != null) ids.add(skill.character_skill_id)
    })
    return ids
  }, [skills])
  const maxLogs = useMemo(() => logs.slice(0, 50), [logs])

  if (!logs || logs.length === 0) {
    return (
      <div className={interfaceStyles.emptyLog}>
        <span className={`${interfaceStyles.headingIcon} mb-1 h-11 w-11 rounded-xl`}>
          <ScrollText aria-hidden="true" className="h-5 w-5" />
        </span>
        <p className="text-foreground text-sm font-medium">暂无战斗记录</p>
        <p className="text-muted-foreground text-xs leading-relaxed">开始战斗后，在这里查看战果与收获。</p>
      </div>
    )
  }
  return (
    <>
      {maxLogs.map((log, index) => {
        const logKey =
          'combat_log_id' in log && log.combat_log_id
            ? `log-${log.combat_log_id}`
            : 'id' in log && log.id
              ? `log-${log.id}`
              : `combat-log-${index}`
        // 没有回合概念，只显示战斗状态
        const isVictory = 'victory' in log && log.victory === true
        const logId = extractCombatLogId(log)

        const playerSkillsUsed = filterPlayerSkillsUsed(log.skills_used, playerSkillIds)

        return (
          <div key={logKey}>
            {/* 战斗日志主体 - 可点击 */}
            <div
              role={logId ? 'button' : undefined}
              tabIndex={logId ? 0 : undefined}
              aria-label={logId ? `查看${getCombatLogMonsterName(log)}的战斗记录` : undefined}
              onClick={() => {
                const id = extractCombatLogId(log)
                if (id) {
                  setSelectedLogId(id)
                  setSelectedLog(log)
                }
              }}
              onKeyDown={e => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  const id = extractCombatLogId(log)
                  if (id) {
                    setSelectedLogId(id)
                    setSelectedLog(log)
                  }
                }
              }}
              className={`${interfaceStyles.logRow} focus-visible:ring-ring flex min-h-12 w-full items-center gap-2 px-2 py-2 text-xs focus-visible:ring-2 focus-visible:outline-none ${logId ? 'cursor-pointer' : ''}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden sm:gap-2">
                {isVictory ? (
                  <CircleCheckBig className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Swords className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                )}
                <span className="text-foreground truncate font-medium">{getCombatLogMonsterName(log)}</span>
                {playerSkillsUsed.length > 0 && <CombatLogSkillIcons skills={playerSkillsUsed} />}
              </div>
              <div className="flex h-5 shrink-0 items-center justify-end gap-1 sm:gap-2">
                {log.loot?.item && (
                  <CombatLogLootIcon
                    item={log.loot.item}
                    onClick={() => setSelectedItem(log.loot!.item!)}
                  />
                )}
                {(log.copper_gained ?? 0) > 0 && (
                  <span className="inline-flex h-4 items-center gap-0.5 leading-none text-[11px] tabular-nums text-yellow-600 dark:text-yellow-400">
                    <span className="leading-none">+</span>
                    <CopperDisplay
                      copper={log.copper_gained}
                      size="xs"
                      nowrap
                      className="!text-[11px] leading-none"
                    />
                  </span>
                )}
                {(log.experience_gained ?? 0) > 0 && (
                  <span
                    className="inline-flex h-4 items-center leading-none text-[11px] tabular-nums text-purple-600 dark:text-purple-300"
                    title={`获得 ${log.experience_gained} 经验`}
                  >
                    +{log.experience_gained}
                    <span className="ml-0.5 text-[9px] leading-none">EXP</span>
                  </span>
                )}
                {logId && <ChevronRight aria-hidden="true" className="text-muted-foreground/60 h-3 w-3" />}
              </div>
            </div>
          </div>
        )
      })}
      {selectedItem && (
        <ItemDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
      {selectedLogId && (
        <CombatLogDetailDialog
          logId={selectedLogId}
          fallbackLog={selectedLog}
          playerSkillIds={playerSkillIds}
          onClose={() => {
            setSelectedLogId(null)
            setSelectedLog(null)
          }}
        />
      )}
    </>
  )
}
