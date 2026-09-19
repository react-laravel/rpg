'use client'

import { type CombatMonster, type SkillUsedEntry } from '../../types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MonsterIcon } from './MonsterIcon'
import { MonsterInfoDialog } from './MonsterInfoDialog'
import { CombatResourceBars } from './CombatResourceBars'
import {
  isRenderableCombatMonster,
  COMBAT_MONSTER_COLS,
  COMBAT_MONSTER_GRID_MAX_WIDTH_CLASS,
  COMBAT_UNIT_PANEL_WIDTH_CLASS,
  getCombatMonsterNameClass,
} from '../../utils/combatUtils'
import styles from '../../rpg.module.css'

type MonsterWithMeta = CombatMonster & { damage_taken?: number; was_attacked?: boolean }

// sessionStorage key，用于持久化已显示过动画的怪物 instance_id
const APPEARED_MONSTERS_KEY = 'rpg_appeared_monsters'
const DAMAGE_TEXT_DURATION_MS = 2200
const DEAD_MONSTER_HOLD_MS = 2400

/** 获取已显示过动画的怪物 ID 集合 */
function getAppearedMonsters(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = sessionStorage.getItem(APPEARED_MONSTERS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

/** 保存已显示过动画的怪物 ID */
function saveAppearedMonsters(ids: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(APPEARED_MONSTERS_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

/** 显示多只怪物（固定5个位置，支持 null 占位） */
export function MonsterGroup({
  monsters,
  skillUsed,
  skillTargetPositions,
  showDamageAndHp = true,
  isCrit = false,
  onAppearActiveChange,
}: {
  monsters: (MonsterWithMeta | null)[]
  skillUsed?: SkillUsedEntry | null
  skillTargetPositions?: number[]
  /** 为 false 时表示技能动画中，不显示扣血/伤害/受击，并清空已有状态避免重复播放 */
  showDamageAndHp?: boolean
  isCrit?: boolean
  /** 出现动画进行中（用于延迟技能特效与扣血显示） */
  onAppearActiveChange?: (active: boolean) => void
}) {
  const prevMonstersRef = useRef<MonsterWithMeta[]>([])
  // 按槽位记录上一帧 instance_id，避免刷新后存留怪物被误判为「新出现」
  const prevSlotInstanceRef = useRef<Record<number, string | null>>({})
  // 存储当前新出现的怪物 instance_id（立即可用，不需要等待状态更新）
  const newAppearingRef = useRef<Set<string>>(new Set())
  const [damageTexts, setDamageTexts] = useState<Record<string, number>>({})
  // 选中的怪物（用于弹窗显示）
  const [selectedMonster, setSelectedMonster] = useState<MonsterWithMeta | null>(null)
  // 记录死亡的怪物，用于触发动画
  const [deadMonsters, setDeadMonsters] = useState<Set<string>>(new Set())
  // 保留刚死亡怪物的快照，避免后端马上清空该位置导致伤害数字看不清
  const [deadMonsterSnapshots, setDeadMonsterSnapshots] = useState<Record<string, MonsterWithMeta>>(
    {}
  )
  // 记录需要显示出现动画的怪物 instance_id（仅当前会话使用，不从 sessionStorage 初始化）
  const [appearingMonsters, setAppearingMonsters] = useState<Set<string>>(new Set())
  // 记录需要显示被攻击后退动画的怪物 position
  const [hitMonsters, setHitMonsters] = useState<Set<number>>(new Set())
  // 本组件创建的所有定时器，卸载时统一清理，避免对已卸载组件 setState
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const scheduledDeadRemovalRef = useRef<Set<string>>(new Set())

  const scheduleTimeout = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timersRef.current.delete(t)
      fn()
    }, ms)
    timersRef.current.add(t)
  }

  useEffect(() => {
    const timers = timersRef.current
    const scheduledDeadRemoval = scheduledDeadRemovalRef.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
      scheduledDeadRemoval.clear()
    }
  }, [])

  const handleMonsterClick = (m: MonsterWithMeta) => {
    setSelectedMonster(m)
  }

  // 过滤出有效的怪物（用于效果和新怪物检测）
  const validMonsters = useMemo(
    () => monsters?.filter((m): m is MonsterWithMeta => isRenderableCombatMonster(m)) ?? [],
    [monsters]
  )

  // 检查是否有有效怪物
  const hasValidMonsters = validMonsters.length > 0

  // 检测新怪物并触发出现动画（按槽位对比 instance_id，存留怪物不重复播放）
  useEffect(() => {
    const appearedMonsters = getAppearedMonsters()
    const newAppearing: string[] = []

    for (let pos = 0; pos < COMBAT_MONSTER_COLS; pos++) {
      const m = monsters[pos]
      if (!isRenderableCombatMonster(m) || !m.instance_id) continue

      const instanceId = m.instance_id
      const prevId = prevSlotInstanceRef.current[pos] ?? null

      // 同一槽位仍是同一实例（例如 3 秒刷新后存留的怪）→ 不播出现动画
      if (instanceId === prevId) continue

      if (!appearedMonsters.has(instanceId)) {
        newAppearing.push(instanceId)
      }
    }

    const nextSlots: Record<number, string | null> = {}
    for (let pos = 0; pos < COMBAT_MONSTER_COLS; pos++) {
      const m = monsters[pos]
      nextSlots[pos] = isRenderableCombatMonster(m) ? (m.instance_id ?? null) : null
    }
    prevSlotInstanceRef.current = nextSlots

    if (newAppearing.length > 0) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        newAppearing.forEach(id => appearedMonsters.add(id))
        saveAppearedMonsters(appearedMonsters)
        return
      }
      newAppearingRef.current = new Set(newAppearing)
      queueMicrotask(() => {
        setAppearingMonsters(prev => {
          const next = new Set(prev)
          newAppearing.forEach(id => next.add(id))
          return next
        })
        const updatedAppeared = new Set(appearedMonsters)
        newAppearing.forEach(id => updatedAppeared.add(id))
        saveAppearedMonsters(updatedAppeared)
      })
      scheduleTimeout(() => {
        setAppearingMonsters(prev => {
          const next = new Set(prev)
          newAppearing.forEach(id => next.delete(id))
          return next
        })
        newAppearing.forEach(id => newAppearingRef.current.delete(id))
      }, 1200)
    }
  }, [monsters])

  useEffect(() => {
    onAppearActiveChange?.(appearingMonsters.size > 0)
  }, [appearingMonsters, onAppearActiveChange])

  // 检测怪物死亡/复位（与扣血显示解耦，避免技能动画结束后才写入快照）
  useEffect(() => {
    const deadEntries = validMonsters
      .filter(m => (m.hp ?? 0) <= 0)
      .map(m => [`pos-${m.position}`, m] as const)
    const aliveKeys = validMonsters.filter(m => (m.hp ?? 0) > 0).map(m => `pos-${m.position}`)

    if (deadEntries.length === 0 && aliveKeys.length === 0) return

    queueMicrotask(() => {
      if (deadEntries.length > 0) {
        setDeadMonsterSnapshots(snapshots => {
          let changed = false
          const next = { ...snapshots }
          deadEntries.forEach(([key, monster]) => {
            if (next[key] !== monster) {
              next[key] = monster
              changed = true
            }
          })
          return changed ? next : snapshots
        })
      }

      aliveKeys.forEach(key => scheduledDeadRemovalRef.current.delete(key))

      setDeadMonsters(prev => {
        let changed = false
        const next = new Set(prev)
        deadEntries.forEach(([key]) => {
          if (!next.has(key)) {
            next.add(key)
            changed = true
          }
          if (!scheduledDeadRemovalRef.current.has(key)) {
            scheduledDeadRemovalRef.current.add(key)
            scheduleTimeout(() => {
              scheduledDeadRemovalRef.current.delete(key)
              setDeadMonsters(current => {
                if (!current.has(key)) return current
                const updated = new Set(current)
                updated.delete(key)
                return updated
              })
              setDeadMonsterSnapshots(snapshots => {
                if (!(key in snapshots)) return snapshots
                const { [key]: _removed, ...rest } = snapshots
                return rest
              })
            }, DEAD_MONSTER_HOLD_MS)
          }
        })
        aliveKeys.forEach(key => {
          if (next.has(key)) {
            next.delete(key)
            changed = true
          }
        })
        return changed ? next : prev
      })

      if (aliveKeys.length > 0) {
        setDeadMonsterSnapshots(snapshots => {
          let changed = false
          const next = { ...snapshots }
          aliveKeys.forEach(key => {
            if (key in next) {
              delete next[key]
              changed = true
            }
          })
          return changed ? next : snapshots
        })
      }
    })
  }, [validMonsters])

  // 检测怪物掉血、受击（仅在允许显示扣血后执行）
  useEffect(() => {
    if (!showDamageAndHp) return

    if (prevMonstersRef.current.length === 0 || validMonsters.length === 0) {
      prevMonstersRef.current = validMonsters
      return
    }

    const newDamage: Record<string, number> = {}

    validMonsters.forEach(m => {
      // 使用 position 作为 key 来区分同一波中的不同怪物实例
      const key = `pos-${m.position}`
      const d = m.damage_taken
      // damage_taken >= 0 表示本次被攻击了，-1 表示未受攻击
      if (d != null && d >= 0) {
        newDamage[key] = d
      }
    })

    if (Object.keys(newDamage).length > 0) {
      queueMicrotask(() => {
        setDamageTexts(prev => ({ ...prev, ...newDamage }))
        scheduleTimeout(() => setDamageTexts({}), DAMAGE_TEXT_DURATION_MS)
      })
      // 触发被攻击后退动画（被攻击且伤害大于0时）
      const hitPositions = validMonsters
        .filter(
          m =>
            m.damage_taken != null &&
            m.damage_taken >= 0 &&
            m.damage_taken > 0 &&
            m.position != null
        )
        .map(m => m.position as number)
      if (hitPositions.length > 0) {
        queueMicrotask(() => {
          setHitMonsters(new Set(hitPositions))
          // 300ms后清除动画状态（与 monster-hit 动画时长一致）
          scheduleTimeout(() => setHitMonsters(new Set()), 300)
        })
      }
    }

    prevMonstersRef.current = validMonsters
  }, [validMonsters, showDamageAndHp])

  // 检测战斗结束（没有活着的怪物）时清除已显示动画的缓存
  useEffect(() => {
    const hasAliveMonsters = validMonsters.some(m => (m.hp ?? 0) > 0)
    if (!hasAliveMonsters && validMonsters.length > 0) {
      saveAppearedMonsters(new Set())
      prevSlotInstanceRef.current = {}
    }
  }, [validMonsters])

  // 如果没有有效怪物则不渲染
  if (!hasValidMonsters && Object.keys(deadMonsterSnapshots).length === 0) return null

  const slotPositions = Array.from({ length: COMBAT_MONSTER_COLS }, (_, i) => i)

  return (
    <>
      <div
        className={`${COMBAT_MONSTER_GRID_MAX_WIDTH_CLASS} grid grid-cols-5 items-end justify-items-center gap-x-1 overflow-visible sm:gap-x-2`}
      >
        {slotPositions.map(pos => {
          const liveMonster = monsters[pos]
          const monsterKey = `pos-${pos}`
          const m = isRenderableCombatMonster(liveMonster)
            ? liveMonster
            : deadMonsterSnapshots[monsterKey]
          if (!isRenderableCombatMonster(m)) {
            return <div key={`slot-${pos}`} className="min-h-px w-full" aria-hidden />
          }

          const displayMonsterKey = `pos-${m.position ?? pos}`
          const isDead = (m.hp ?? 0) <= 0
          const isDying =
            isDead &&
            (deadMonsters.has(displayMonsterKey) ||
              deadMonsterSnapshots[displayMonsterKey] != null ||
              showDamageAndHp)
          // 技能动画期间仍显示扣血前血量；结算后 hp<=0 立即进入死亡展示，不等待异步状态
          if (isDead && !isDying) {
            return <div key={`slot-${pos}`} className="min-h-px w-full" aria-hidden />
          }

          const isNew = m.instance_id ? appearingMonsters.has(m.instance_id) : false
          const damage = showDamageAndHp ? damageTexts[displayMonsterKey] : undefined
          const isHit = showDamageAndHp && m.position != null && hitMonsters.has(m.position)
          const typeLabel = m.type === 'boss' ? 'Boss' : m.type === 'elite' ? '精英' : '普通'

          // 使用 instance_id 作为 key，这样新怪物出现时会重新创建元素触发动画
          return (
            <button
              key={m.instance_id ?? monsterKey}
              data-monster-type={m.type}
              type="button"
              onClick={() => handleMonsterClick(m)}
              className={`${COMBAT_UNIT_PANEL_WIDTH_CLASS} focus-visible:ring-primary relative flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-md transition-[background-color,opacity] hover:bg-black/20 focus:outline-none focus-visible:ring-2 ${isNew ? styles['monster-appear'] : ''} ${isDead ? styles['monster-death'] : ''} ${isHit ? styles['monster-hit'] : ''}`}
              title={`点击查看 ${m.name} 详情 · ${typeLabel}`}
              aria-label={`${m.name}，${typeLabel}，生命 ${m.hp ?? 0}/${m.max_hp ?? 0}`}
            >
              <CombatResourceBars hp={m.hp ?? 0} maxHp={m.max_hp ?? 0} />
              <div data-effect-target={pos} className="relative flex flex-col items-center">
                {damage !== undefined && damage > 0 && (
                  <span
                    className={`${styles['damage-number']} ${isCrit ? styles['damage-number-crit'] : ''} pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap`}
                    data-crit={isCrit ? 'true' : undefined}
                  >
                    {isCrit && <span className={styles['crit-label']}>暴击</span>}
                    -{damage}
                  </span>
                )}
                <span className={!isDead && !isHit && !isNew ? styles['monster-idle'] : undefined}>
                  <MonsterIcon icon={m.icon} name={m.name} />
                </span>
              </div>
              <p data-monster-name className={`${getCombatMonsterNameClass(m.type)} w-full truncate text-center text-[9px] leading-3 font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,1)] sm:text-[11px] sm:leading-4`}>
                {m.name}
              </p>
            </button>
          )
        })}
      </div>

      {/* 怪物信息弹窗 */}
      <MonsterInfoDialog monster={selectedMonster} onClose={() => setSelectedMonster(null)} />
    </>
  )
}
